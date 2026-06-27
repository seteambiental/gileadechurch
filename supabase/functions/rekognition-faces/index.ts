import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AWS_ACCESS_KEY_ID = (Deno.env.get("AWS_ACCESS_KEY_ID") ?? "").trim();
const AWS_SECRET_ACCESS_KEY = (Deno.env.get("AWS_SECRET_ACCESS_KEY") ?? "").trim();
const AWS_REGION = (Deno.env.get("AWS_REGION") || "us-east-1").trim();
const AWS_SESSION_TOKEN = (Deno.env.get("AWS_SESSION_TOKEN") ?? "").trim();
const COLLECTION_ID = "gileade-faces";

// Helper to convert ArrayBuffer to base64 without stack overflow
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
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

  // When using temporary STS credentials, the session token MUST be part of
  // the signed request, otherwise AWS rejects it with an invalid signature error.
  if (AWS_SESSION_TOKEN) {
    headers["x-amz-security-token"] = AWS_SESSION_TOKEN;
  }
  
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
    if (errorMessage.includes("ResourceNotFoundException") || errorMessage.includes("does not exist")) {
      console.log("Creating collection:", COLLECTION_ID);
      await callRekognition("CreateCollection", { CollectionId: COLLECTION_ID });
    } else {
      throw error;
    }
  }
}

// Crop a face from an image based on bounding box
function cropFaceFromImage(imageBytes: Uint8Array, width: number, height: number, boundingBox: any): string {
  // BoundingBox values are ratios (0-1), we need to calculate pixel coordinates
  const left = Math.max(0, Math.floor(boundingBox.Left * width) - 20);
  const top = Math.max(0, Math.floor(boundingBox.Top * height) - 20);
  const faceWidth = Math.min(width - left, Math.ceil(boundingBox.Width * width) + 40);
  const faceHeight = Math.min(height - top, Math.ceil(boundingBox.Height * height) + 40);
  
  // We can't crop in Deno without image libraries, so we'll use the full image
  // but with SearchFaces instead of SearchFacesByImage
  // Actually, we'll use a different approach: IndexFaces temporarily then SearchFaces
  return "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const _authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
    const { data: _claims, error: _authErr } = await _authClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (_authErr || !_claims?.claims) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { action, ...params } = await req.json();
    
    await ensureCollectionExists();
    
    switch (action) {
      case "index_face": {
        const { imageUrl, memberId, novoConvertidoId } = params;
        
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
        const { imageUrl, casaRefugioId, encontroId } = params;
        
        console.log(`Analyzing photo for casa_refugio: ${casaRefugioId}`);
        
        const imageResponse = await fetch(imageUrl);
        const imageBuffer = await imageResponse.arrayBuffer();
        const imageBytes = arrayBufferToBase64(imageBuffer);
        
        // First, detect faces to count total and get age estimates
        const detectResult = await callRekognition("DetectFaces", {
          Image: { Bytes: imageBytes },
          Attributes: ["ALL"]
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
        
        // NEW APPROACH: For group photos, we need to search for EACH detected face individually
        // SearchFacesByImage only matches the LARGEST face in the source image
        // So we use IndexFaces with a temporary collection approach, or search multiple times
        
        // Strategy: Index faces from the group photo temporarily, then search each against our collection
        // Better strategy: Use SearchFacesByImage for each face by cropping
        // Simplest working strategy: Index all faces from group photo into a temp collection,
        // then compare each face ID against our known faces
        
        const TEMP_COLLECTION_ID = `temp-${Date.now()}`;
        let tempCollectionCreated = false;
        
        const presentMembers: any[] = [];
        const presentNC: any[] = [];
        const presentChildren: any[] = [];
        const matchedPersonIds = new Set<string>();
        
        try {
          // Create a temporary collection and index all faces from the group photo
          await callRekognition("CreateCollection", { CollectionId: TEMP_COLLECTION_ID });
          tempCollectionCreated = true;
          
          const indexResult = await callRekognition("IndexFaces", {
            CollectionId: TEMP_COLLECTION_ID,
            Image: { Bytes: imageBytes },
            MaxFaces: 50,
            QualityFilter: "NONE",
            DetectionAttributes: ["DEFAULT"]
          });
          
          const indexedFaces = indexResult.FaceRecords || [];
          console.log(`Indexed ${indexedFaces.length} faces from group photo into temp collection`);
          
          // Now for each indexed face, search it against our main collection
          for (const faceRecord of indexedFaces) {
            const tempFaceId = faceRecord.Face.FaceId;
            
            try {
              // Search this face against our main collection using SearchFaces
              // But SearchFaces requires the face to be IN the collection being searched
              // So instead, we need to use the face image bytes
              
              // We'll use the bounding box to understand which face we're looking at
              // But actually, we can search by face ID only within the same collection
              
              // Better approach: For each known member face, search it in the temp collection
              // This way we check if each member appears in the group photo
            } catch (e) {
              console.log(`Error searching face ${tempFaceId}:`, e);
            }
          }
          
          // Search each known face against the temp collection (group photo faces)
          if (faceIndexes && faceIndexes.length > 0) {
            for (const faceIndex of faceIndexes) {
              try {
                const searchResult = await callRekognition("SearchFaces", {
                  CollectionId: TEMP_COLLECTION_ID,
                  FaceId: faceIndex.face_id,
                  MaxFaces: 1,
                  FaceMatchThreshold: 70
                });
                
                // This won't work because faceIndex.face_id is from COLLECTION_ID, not TEMP_COLLECTION_ID
                // SearchFaces requires the source face to be in the same collection
              } catch (e) {
                // Expected to fail - face not in temp collection
              }
            }
          }
          
          // CORRECT APPROACH: For each member with a photo, use SearchFacesByImage against the temp collection
          // This searches for a single face (from member's photo) in the group photo faces
          const allPersons = [
            ...(membrosVinculados || []).map(m => ({ ...m, type: 'member', birthField: m.birth_date })),
            ...(ncVinculados || []).map(n => ({ ...n, type: 'nc', birthField: n.data_nascimento })),
          ];
          
          // Only search persons who have indexed faces (meaning they have a photo)
          const indexedPersonIds = new Set(faceIndexes?.map(fi => fi.member_id || fi.novo_convertido_id) || []);
          
          for (const person of allPersons) {
            if (!indexedPersonIds.has(person.id)) continue;
            if (!person.photo_url) continue;
            
            try {
              // Fetch the member's photo
              const memberPhotoResponse = await fetch(person.photo_url);
              if (!memberPhotoResponse.ok) continue;
              const memberPhotoBuffer = await memberPhotoResponse.arrayBuffer();
              const memberPhotoBytes = arrayBufferToBase64(memberPhotoBuffer);
              
              // Search for this member's face in the temp collection (group photo)
              const searchResult = await callRekognition("SearchFacesByImage", {
                CollectionId: TEMP_COLLECTION_ID,
                Image: { Bytes: memberPhotoBytes },
                MaxFaces: 1,
                FaceMatchThreshold: 70
              });
              
              const matches = searchResult.FaceMatches || [];
              if (matches.length > 0) {
                const confidence = matches[0].Similarity;
                const age = calculateAge(person.birthField);
                const isChild = age !== null && age < 12;
                
                if (matchedPersonIds.has(person.id)) continue;
                matchedPersonIds.add(person.id);
                
                console.log(`Found ${person.full_name} in group photo (confidence: ${confidence}%)`);
                
                if (isChild) {
                  presentChildren.push({ id: person.id, full_name: person.full_name, photo_url: person.photo_url, confidence, age, type: person.type });
                } else if (person.type === 'member') {
                  presentMembers.push({ id: person.id, full_name: person.full_name, photo_url: person.photo_url, confidence, age });
                } else {
                  presentNC.push({ id: person.id, full_name: person.full_name, photo_url: person.photo_url, confidence, age });
                }
              }
            } catch (searchError) {
              // Face not found or error - skip
              const errMsg = searchError instanceof Error ? searchError.message : String(searchError);
              if (!errMsg.includes("no faces in the image")) {
                console.log(`Search error for ${person.full_name}:`, errMsg);
              }
            }
          }
          
        } finally {
          // Clean up temp collection
          if (tempCollectionCreated) {
            try {
              await callRekognition("DeleteCollection", { CollectionId: TEMP_COLLECTION_ID });
              console.log(`Deleted temp collection ${TEMP_COLLECTION_ID}`);
            } catch (e) {
              console.error("Error deleting temp collection:", e);
            }
          }
        }
        
        // Calculate unidentified faces
        const totalIdentified = presentMembers.length + presentNC.length + presentChildren.length;
        const unidentifiedFaces = Math.max(0, totalFaces - totalIdentified);
        
        const unidentifiedChildren = Math.max(0, estimatedChildren - presentChildren.length);
        const unidentifiedAdults = Math.max(0, unidentifiedFaces - unidentifiedChildren);
        
        console.log(`Summary: ${totalFaces} faces, ${totalIdentified} identified, ${unidentifiedFaces} unidentified`);
        console.log(`Children: ${presentChildren.length} identified, ~${unidentifiedChildren} unidentified`);
        
        // Find absent members
        const allPresentIds = [...presentMembers.map(m => m.id), ...presentNC.map(n => n.id), ...presentChildren.map(c => c.id)];
        
        const absentMembers = membrosVinculados?.filter(m => !allPresentIds.includes(m.id)) || [];
        const absentNC = ncVinculados?.filter(n => !allPresentIds.includes(n.id)) || [];
        
        // Save presence records if encontroId provided
        if (encontroId) {
          await supabase.from("encontro_presencas").delete().eq("encontro_id", encontroId);
          
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
        const { faceId } = params;
        
        await callRekognition("DeleteFaces", {
          CollectionId: COLLECTION_ID,
          FaceIds: [faceId]
        });
        
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
