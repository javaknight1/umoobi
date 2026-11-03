# Switching on DRM (D44, T022)

During the closed beta, masters play through signed Mux URLs that expire after 6 hours but aren't encrypted.
DRM (Widevine for Chrome/Android/Chromecast, FairPlay for Safari/iOS/AirPlay) must be on before public launch.
Beta filmmakers are told this up front.

## What's already in the code

- `MUX_DRM_ENABLED=true` + `MUX_DRM_CONFIGURATION_ID` make new master uploads use Mux's `drm` advanced playback
  policy (`src/lib/video/mux.ts`).
- The playback token route signs a `drm_license` token when DRM is on, and the player passes it to Mux Player
  (`tokens.drm`), which handles Widevine and FairPlay license requests.
- Trailers and clips stay public (free footage, D17/D23).

## Steps

1. **Apple Developer account** ($99/yr, T026) → request a FairPlay Streaming certificate (Apple reviews the
   request; allow several days). Upload the certificate, private key and ASK to Mux (Mux dashboard → DRM).
2. **Mux DRM**: enable DRM on the Mux environment ($100/month + $0.003 per license) and note the DRM
   configuration id → `MUX_DRM_CONFIGURATION_ID`; set `MUX_DRM_ENABLED=true` in Vercel.
3. **Existing masters**: assets created before step 2 keep their signed (non-DRM) playback id. Add a DRM
   playback id to each (`POST /video/v1/assets/{id}/playback-ids` with the DRM policy), store it in
   `film_assets.mux_playback_id`, then delete the old signed playback id. Script this from `film_assets where
   kind = 'master' and status = 'ready'`; run it once, in a quiet hour.
4. **Chromecast** (T012, T027): Widevine on Cast needs a custom Web Receiver. Register a Cast app ($5), host the
   receiver at `/cast/receiver` (CAF receiver with the Mux license URL and the `drm_license` token passed from
   the sender), and set the receiver app id on Mux Player (`castReceiver`). Until then, casting DRM content
   doesn't play; AirPlay works through Safari's FairPlay.
5. **Test matrix** before announcing: Chrome (Mac/Windows), Safari (Mac/iOS), Firefox, Android Chrome, Chromecast,
   AirPlay. Rentals and purchases must both play; an expired rental must fail with the library message.
6. Update the beta notice and the terms if they mention unencrypted playback.

## Costs (base case, Technical Requirements)

About $127/month for DRM at ~9,000 sales/month (the $100 base plus licenses).
