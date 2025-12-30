import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AWS_ACCESS_KEY_ID = (Deno.env.get("AWS_ACCESS_KEY_ID") ?? "").trim();
const AWS_SECRET_ACCESS_KEY = (Deno.env.get("AWS_SECRET_ACCESS_KEY") ?? "").trim();
const AWS_REGION = (Deno.env.get("AWS_REGION") || "us-east-1").trim();
const COLLECTION_ID = "gileade-faces";

// Helper to convert ArrayBuffer to base64 without stack overflow
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000; // 32KB chunks to avoid call stack issues
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

// Helper to calculate age from birth date
function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

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
  region: string
): Promise<Record<string, string>> {
  const encoder = new TextEncoder();

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  headers["x-amz-date"] = amzDate;
  headers["host"] = host;

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

async function callRekognition(action: string, payload: object) {
  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    throw new Error("AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in secrets.");
  }

  console.log(`Rekognition call: ${action}, region=${AWS_REGION}, accessKeyId=${AWS_ACCESS_KEY_ID.slice(0, 4)}...`);

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
    const errorMessage = error instanceof Error ? error.message : "";
    // Only create if collection doesn't exist (ResourceNotFoundException)
    if (errorMessage.includes("ResourceNotFoundException") || errorMessage.includes("does not exist")) {
      console.log("Creating collection:", COLLECTION_ID);
      await callRekognition("CreateCollection", { CollectionId: COLLECTION_ID });
    } else {
      throw error;
    }
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
        const imageBytes = arrayBufferToBase64(imageBuffer);
        
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
        
        console.log(`Analyzing photo for casa_refugio: ${casaRefugioId}`);
        
        // Fetch image
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        const imageBytes = arrayBufferToBase64(imageBuffer);
        
        // First, detect faces to count total and get age estimates
        const detectResult = await callRekognition("DetectFaces", {
          Image: { Bytes: imageBytes },
          Attributes: ["ALL"] // Get age estimates
        });
        
        const faceDetails = detectResult.FaceDetails || [];
        const totalFaces = faceDetails.length;
        
        console.log(`Detected ${totalFaces} faces in photo`);
        
        // Count children by AWS age estimation (under 12 years old)
        let estimatedChildren = 0;
        for (const face of faceDetails) {
          if (face.AgeRange) {
            const avgAge = (face.AgeRange.Low + face.AgeRange.High) / 2;
            if (avgAge < 12) {
              estimatedChildren++;
              console.log(`Face estimated as child: age range ${face.AgeRange.Low}-${face.AgeRange.High}`);
            }
          }
        }
        
        // Get database connection
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Get all members and novos_convertidos linked to this casa_refugio with birth_date
        const { data: membrosVinculados } = await supabase
          .from("members")
          .select("id, full_name, whatsapp, photo_url, birth_date")
          .eq("casa_refugio_id", casaRefugioId);
        
        const { data: ncVinculados } = await supabase
          .from("novos_convertidos")
          .select("id, full_name, whatsapp, photo_url, data_nascimento")
          .or(`casa_refugio_id.eq.${casaRefugioId},casa_refugio_frequenta_id.eq.${casaRefugioId}`);
        
        // Get face indexes
        const { data: faceIndexes } = await supabase
          .from("member_face_indexes")
          .select("*");
        
        console.log(`Found ${faceIndexes?.length || 0} indexed faces in database`);
        
        // Search for faces in collection - this returns all matches
        let matchedFaces: any[] = [];
        try {
          const searchResult = await callRekognition("SearchFacesByImage", {
            CollectionId: COLLECTION_ID,
            Image: { Bytes: imageBytes },
            MaxFaces: 50,
            FaceMatchThreshold: 70 // Lowered threshold for better detection
          });
          matchedFaces = searchResult.FaceMatches || [];
          console.log(`SearchFacesByImage found ${matchedFaces.length} matches`);
        } catch (searchError) {
          console.log("SearchFacesByImage error (may be no faces in collection):", searchError);
        }
        
        // Map matched faces to members
        const presentMembers: any[] = [];
        const presentNC: any[] = [];
        const presentChildren: any[] = [];
        const matchedFaceIds = new Set<string>();
        
        for (const match of matchedFaces) {
          const faceId = match.Face.FaceId;
          const confidence = match.Similarity;
          
          // Skip if already processed
          if (matchedFaceIds.has(faceId)) continue;
          matchedFaceIds.add(faceId);
          
          const faceIndex = faceIndexes?.find(fi => fi.face_id === faceId);
          if (faceIndex) {
            console.log(`Matched face ${faceId} with confidence ${confidence}%`);
            
            if (faceIndex.member_id) {
              const member = membrosVinculados?.find(m => m.id === faceIndex.member_id);
              if (member) {
                const age = calculateAge(member.birth_date);
                const isChild = age !== null && age < 12;
                
                if (isChild) {
                  presentChildren.push({ ...member, confidence, age, type: 'member' });
                  console.log(`Identified child member: ${member.full_name}, age ${age}`);
                } else {
                  presentMembers.push({ ...member, confidence, age });
                  console.log(`Identified adult member: ${member.full_name}`);
                }
              }
            } else if (faceIndex.novo_convertido_id) {
              const nc = ncVinculados?.find(n => n.id === faceIndex.novo_convertido_id);
              if (nc) {
                const age = calculateAge(nc.data_nascimento);
                const isChild = age !== null && age < 12;
                
                if (isChild) {
                  presentChildren.push({ ...nc, confidence, age, type: 'nc' });
                  console.log(`Identified child NC: ${nc.full_name}, age ${age}`);
                } else {
                  presentNC.push({ ...nc, confidence, age });
                  console.log(`Identified adult NC: ${nc.full_name}`);
                }
              }
            }
          }
        }
        
        // Calculate unidentified faces
        const totalIdentified = presentMembers.length + presentNC.length + presentChildren.length;
        const unidentifiedFaces = Math.max(0, totalFaces - totalIdentified);
        
        // Estimate unidentified children based on AWS detection minus identified children
        const unidentifiedChildren = Math.max(0, estimatedChildren - presentChildren.length);
        const unidentifiedAdults = Math.max(0, unidentifiedFaces - unidentifiedChildren);
        
        console.log(`Summary: ${totalFaces} faces, ${totalIdentified} identified, ${unidentifiedFaces} unidentified`);
        console.log(`Children: ${presentChildren.length} identified, ~${unidentifiedChildren} unidentified (AWS estimate)`);
        
        // Find absent members (those linked to casa but not present)
        const presentMemberIds = presentMembers.map(m => m.id);
        const presentNCIds = presentNC.map(n => n.id);
        const presentChildrenIds = presentChildren.map(c => c.id);
        const allPresentIds = [...presentMemberIds, ...presentNCIds, ...presentChildrenIds];
        
        const absentMembers = membrosVinculados?.filter(m => !allPresentIds.includes(m.id)) || [];
        const absentNC = ncVinculados?.filter(n => !allPresentIds.includes(n.id)) || [];
        
        // Save presence records if encontroId provided
        if (encontroId) {
          // Clear existing records for this encontro
          await supabase.from("encontro_presencas").delete().eq("encontro_id", encontroId);
          
          // Insert present members
          for (const member of [...presentMembers, ...presentChildren.filter(c => c.type === 'member')]) {
            await supabase.from("encontro_presencas").insert({
              encontro_id: encontroId,
              member_id: member.id,
              presente: true,
              confidence: member.confidence
            });
          }
          
          for (const nc of [...presentNC, ...presentChildren.filter(c => c.type === 'nc')]) {
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
          totalMatched: totalIdentified,
          presentMembers,
          presentNC,
          presentChildren,
          absentMembers,
          absentNC,
          estimatedChildren,
          unidentifiedChildren,
          unidentifiedAdults
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
