import AgoraRTC from "agora-rtc-sdk-ng";

export const agoraClient = AgoraRTC.createClient({ 
  mode: "rtc", 
  codec: "vp8",
  useStringUserId: true
});
