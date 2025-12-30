import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AWS_ACCESS_KEY_ID = (Deno.env.get("AWS_ACCESS_KEY_ID") ?? "").trim();
const AWS_SECRET_ACCESS_KEY = (Deno.env.get("AWS_SECRET_ACCESS_KEY") ?? "").trim();
const AWS_REGION = (Deno.env.get("AWS_REGION") || "us-east-1").trim();
const AWS_ROLE_ARN = (Deno.env.get("AWS_ROLE_ARN") ?? "").trim();
const COLLECTION_ID = "gileade-faces";

// Cache for STS credentials
let cachedCredentials: {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  expiration: Date;
} | null = null;

// Helper to create AWS signature
async function createAWSSignature(
  method: string,
  service: string,
  host: string,
  uri: string,
  queryString: string,
  headers: Record<string, string>,
  payload: string,
  accessKey: string,
  secretKey: string,
  region: string,
  sessionToken?: string
): Promise<Record<string, string>> {
  const encoder = new TextEncoder();

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  headers["x-amz-date"] = amzDate;
  headers["host"] = host;

  // Add session token if provided
  if (sessionToken) {
    headers["x-amz-security-token"] = sessionToken;
  }

  const payloadHash = await crypto.subtle.digest("SHA-256", encoder.encode(payload));
  const payloadHashHex = Array.from(new Uint8Array(payloadHash)).map((b) => b.toString(16).padStart(2, "0")).join("");

  headers["x-amz-content-sha256"] = payloadHashHex;

  const sortedHeaders = Object.keys(headers).sort();
  const signedHeaders = sortedHeaders.join(";");
  const canonicalHeaders = sortedHeaders.map((k) => `${k}:${headers[k]}\n`).join("");
  
  const canonicalRequest = [
    method,
    uri,
    queryString,
    canonicalHeaders,
    signedHeaders,
    payloadHashHex
  ].join("\n");
  
  const canonicalRequestHash = await crypto.subtle.digest("SHA-256", encoder.encode(canonicalRequest));
  const canonicalRequestHashHex = Array.from(new Uint8Array(canonicalRequestHash)).map(b => b.toString(16).padStart(2, "0")).join("");
  
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    canonicalRequestHashHex
  ].join("\n");
  
  const getSignatureKey = async (key: string, dateStamp: string, region: string, service: string) => {
    const kDate = await crypto.subtle.sign(
      "HMAC",
      await crypto.subtle.importKey("raw", encoder.encode(`AWS4${key}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
      encoder.encode(dateStamp)
    );
    const kRegion = await crypto.subtle.sign(
      "HMAC",
      await crypto.subtle.importKey("raw", kDate, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
      encoder.encode(region)
    );
    const kService = await crypto.subtle.sign(
      "HMAC",
      await crypto.subtle.importKey("raw", kRegion, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
      encoder.encode(service)
    );
    const kSigning = await crypto.subtle.sign(
      "HMAC",
      await crypto.subtle.importKey("raw", kService, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
      encoder.encode("aws4_request")
    );
    return kSigning;
  };
  
  const signingKey = await getSignatureKey(secretKey, dateStamp, region, service);
  const signature = await crypto.subtle.sign(
    "HMAC",
    await crypto.subtle.importKey("raw", signingKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
    encoder.encode(stringToSign)
  );
  const signatureHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, "0")).join("");
  
  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`;
  
  return {
    ...headers,
    "Authorization": authorizationHeader
  };
}

// Get temporary credentials via STS AssumeRole
async function getSTSCredentials(): Promise<{
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}> {
  // Return cached credentials if still valid (with 5 min buffer)
  if (cachedCredentials && cachedCredentials.expiration > new Date(Date.now() + 5 * 60 * 1000)) {
    console.log("Using cached STS credentials");
    return {
      accessKeyId: cachedCredentials.accessKeyId,
      secretAccessKey: cachedCredentials.secretAccessKey,
      sessionToken: cachedCredentials.sessionToken,
    };
  }

  console.log("Getting new STS credentials via AssumeRole...");

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    throw new Error("AWS base credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in secrets.");
  }

  if (!AWS_ROLE_ARN) {
    throw new Error("AWS_ROLE_ARN not configured. Please set the ARN of the role to assume.");
  }

  const host = `sts.${AWS_REGION}.amazonaws.com`;
  const endpoint = `https://${host}`;
  
  const params = new URLSearchParams({
    Action: "AssumeRole",
    Version: "2011-06-15",
    RoleArn: AWS_ROLE_ARN,
    RoleSessionName: "rekognition-edge-function",
    DurationSeconds: "3600", // 1 hour
  });

  const body = params.toString();
  
  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
  };
  
  const signedHeaders = await createAWSSignature(
    "POST",
    "sts",
    host,
    "/",
    "",
    headers,
    body,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION
  );
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: signedHeaders,
    body
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("STS AssumeRole error:", errorText);
    throw new Error(`STS AssumeRole failed: ${response.status} - ${errorText}`);
  }
  
  const responseText = await response.text();
  
  // Parse XML response
  const accessKeyIdMatch = responseText.match(/<AccessKeyId>([^<]+)<\/AccessKeyId>/);
  const secretAccessKeyMatch = responseText.match(/<SecretAccessKey>([^<]+)<\/SecretAccessKey>/);
  const sessionTokenMatch = responseText.match(/<SessionToken>([^<]+)<\/SessionToken>/);
  const expirationMatch = responseText.match(/<Expiration>([^<]+)<\/Expiration>/);
  
  if (!accessKeyIdMatch || !secretAccessKeyMatch || !sessionTokenMatch) {
    console.error("Failed to parse STS response:", responseText);
    throw new Error("Failed to parse STS AssumeRole response");
  }
  
  // Cache the credentials
  cachedCredentials = {
    accessKeyId: accessKeyIdMatch[1],
    secretAccessKey: secretAccessKeyMatch[1],
    sessionToken: sessionTokenMatch[1],
    expiration: expirationMatch ? new Date(expirationMatch[1]) : new Date(Date.now() + 3600 * 1000),
  };
  
  console.log("STS credentials obtained, expires:", cachedCredentials.expiration.toISOString());
  
  return {
    accessKeyId: cachedCredentials.accessKeyId,
    secretAccessKey: cachedCredentials.secretAccessKey,
    sessionToken: cachedCredentials.sessionToken,
  };
}

async function callRekognition(action: string, payload: object) {
  // Get temporary credentials via STS
  const credentials = await getSTSCredentials();

  console.log(`Rekognition call: ${action}, using STS credentials`);

  const host = `rekognition.${AWS_REGION}.amazonaws.com`;
  const endpoint = `https://${host}`;

  const body = JSON.stringify(payload);
  
  const headers: Record<string, string> = {
    "content-type": "application/x-amz-json-1.1",
    "x-amz-target": `RekognitionService.${action}`,
  };
  
  const signedHeaders = await createAWSSignature(
    "POST",
    "rekognition",
    host,
    "/",
    "",
    headers,
    body,
    credentials.accessKeyId,
    credentials.secretAccessKey,
    AWS_REGION,
    credentials.sessionToken
  );
  
  const response = await fetch(endpoint, {
    method: "POST",
    headers: signedHeaders,
    body
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Rekognition error:", errorText);
    throw new Error(`Rekognition error: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

async function ensureCollectionExists() {
  try {
    await callRekognition("DescribeCollection", { CollectionId: COLLECTION_ID });
    console.log("Collection exists:", COLLECTION_ID);
  } catch (error) {
    // Collection doesn't exist, create it
    console.log("Creating collection:", COLLECTION_ID);
    await callRekognition("CreateCollection", { CollectionId: COLLECTION_ID });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    
    await ensureCollectionExists();
    
    switch (action) {
      case "index_face": {
        // Index a face from member photo
        const { imageUrl, memberId, novoConvertidoId } = params;
        
        // Fetch image and convert to base64
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        const imageBytes = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
        
        const externalImageId = memberId || novoConvertidoId;
        
        const result = await callRekognition("IndexFaces", {
          CollectionId: COLLECTION_ID,
          Image: { Bytes: imageBytes },
          ExternalImageId: externalImageId,
          MaxFaces: 1,
          QualityFilter: "AUTO",
          DetectionAttributes: ["DEFAULT"]
        });
        
        if (result.FaceRecords && result.FaceRecords.length > 0) {
          const faceId = result.FaceRecords[0].Face.FaceId;
          
          // Save to database
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const supabase = createClient(supabaseUrl, supabaseKey);
          
          await supabase.from("member_face_indexes").upsert({
            member_id: memberId || null,
            novo_convertido_id: novoConvertidoId || null,
            face_id: faceId,
            external_image_id: externalImageId,
          }, {
            onConflict: memberId ? "member_id" : "novo_convertido_id"
          });
          
          return new Response(JSON.stringify({ success: true, faceId }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        
        return new Response(JSON.stringify({ success: false, error: "No face detected" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      
      case "analyze_photo": {
        // Analyze a photo to find faces and match against collection
        const { imageUrl, casaRefugioId, encontroId } = params;
        
        // Fetch image
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        const imageBytes = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
        
        // First, detect faces to count total
        const detectResult = await callRekognition("DetectFaces", {
          Image: { Bytes: imageBytes },
          Attributes: ["DEFAULT"]
        });
        
        const totalFaces = detectResult.FaceDetails?.length || 0;
        
        // Search for faces in collection
        const searchResult = await callRekognition("SearchFacesByImage", {
          CollectionId: COLLECTION_ID,
          Image: { Bytes: imageBytes },
          MaxFaces: 50,
          FaceMatchThreshold: 80
        });
        
        const matchedFaces = searchResult.FaceMatches || [];
        
        // Get database connection
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Get all members and novos_convertidos linked to this casa_refugio
        const { data: membrosVinculados } = await supabase
          .from("members")
          .select("id, full_name, whatsapp, photo_url")
          .eq("casa_refugio_id", casaRefugioId);
        
        const { data: ncVinculados } = await supabase
          .from("novos_convertidos")
          .select("id, full_name, whatsapp, photo_url")
          .or(`casa_refugio_id.eq.${casaRefugioId},casa_refugio_frequenta_id.eq.${casaRefugioId}`);
        
        // Get face indexes
        const { data: faceIndexes } = await supabase
          .from("member_face_indexes")
          .select("*");
        
        // Map matched faces to members
        const presentMembers: any[] = [];
        const presentNC: any[] = [];
        
        for (const match of matchedFaces) {
          const faceId = match.Face.FaceId;
          const confidence = match.Similarity;
          
          const faceIndex = faceIndexes?.find(fi => fi.face_id === faceId);
          if (faceIndex) {
            if (faceIndex.member_id) {
              const member = membrosVinculados?.find(m => m.id === faceIndex.member_id);
              if (member) {
                presentMembers.push({ ...member, confidence });
              }
            } else if (faceIndex.novo_convertido_id) {
              const nc = ncVinculados?.find(n => n.id === faceIndex.novo_convertido_id);
              if (nc) {
                presentNC.push({ ...nc, confidence });
              }
            }
          }
        }
        
        // Find absent members
        const presentMemberIds = presentMembers.map(m => m.id);
        const presentNCIds = presentNC.map(n => n.id);
        
        const absentMembers = membrosVinculados?.filter(m => !presentMemberIds.includes(m.id)) || [];
        const absentNC = ncVinculados?.filter(n => !presentNCIds.includes(n.id)) || [];
        
        // Save presence records if encontroId provided
        if (encontroId) {
          // Clear existing records for this encontro
          await supabase.from("encontro_presencas").delete().eq("encontro_id", encontroId);
          
          // Insert present members
          for (const member of presentMembers) {
            await supabase.from("encontro_presencas").insert({
              encontro_id: encontroId,
              member_id: member.id,
              presente: true,
              confidence: member.confidence
            });
          }
          
          for (const nc of presentNC) {
            await supabase.from("encontro_presencas").insert({
              encontro_id: encontroId,
              novo_convertido_id: nc.id,
              presente: true,
              confidence: nc.confidence
            });
          }
          
          // Insert absent members
          for (const member of absentMembers) {
            await supabase.from("encontro_presencas").insert({
              encontro_id: encontroId,
              member_id: member.id,
              presente: false
            });
          }
          
          for (const nc of absentNC) {
            await supabase.from("encontro_presencas").insert({
              encontro_id: encontroId,
              novo_convertido_id: nc.id,
              presente: false
            });
          }
        }
        
        return new Response(JSON.stringify({
          success: true,
          totalFaces,
          totalMatched: matchedFaces.length,
          presentMembers,
          presentNC,
          absentMembers,
          absentNC
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      
      case "delete_face": {
        // Delete a face from collection
        const { faceId } = params;
        
        await callRekognition("DeleteFaces", {
          CollectionId: COLLECTION_ID,
          FaceIds: [faceId]
        });
        
        // Also delete from database
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase.from("member_face_indexes").delete().eq("face_id", faceId);
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      
      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
