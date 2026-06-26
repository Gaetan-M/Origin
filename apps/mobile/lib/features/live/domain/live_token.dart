import 'package:origin_mobile/features/live/domain/live_enums.dart';

/// Response of GET /live/:id/token.
///
/// `configured` reflects whether the server has LiveKit creds; when false (or
/// when `token` is null), the room renders the graceful "coming soon" state
/// instead of attempting a connection.
class LiveTokenResponse {
  const LiveTokenResponse({
    required this.configured,
    this.token,
    this.serverUrl,
    this.roomName,
    this.identity,
  });

  final bool configured;
  final String? token;
  final String? serverUrl;
  final String? roomName;
  final String? identity;

  /// True only when the server is configured AND a token + url were minted —
  /// i.e. a real-time connection could actually be opened.
  bool get canConnect =>
      configured &&
      (token?.isNotEmpty ?? false) &&
      (serverUrl?.isNotEmpty ?? false);

  factory LiveTokenResponse.fromJson(Map<String, dynamic> json) {
    return LiveTokenResponse(
      configured: json['configured'] as bool? ?? false,
      token: json['token'] as String?,
      serverUrl: json['serverUrl'] as String? ?? json['server_url'] as String?,
      roomName: json['roomName'] as String? ?? json['room_name'] as String?,
      identity: json['identity'] as String?,
    );
  }
}

/// Response of GET /live/:id/replay — a short-lived playback URL, if published.
class LiveReplayResponse {
  const LiveReplayResponse({
    required this.mediaKind,
    this.url,
  });

  /// Media kind so the UI picks audio vs video. Audio-first by default.
  final LiveReplayMediaKind mediaKind;
  final String? url;

  bool get hasUrl => url?.isNotEmpty ?? false;

  factory LiveReplayResponse.fromJson(Map<String, dynamic> json) {
    return LiveReplayResponse(
      mediaKind: LiveReplayMediaKind.fromWire(
        json['mediaKind'] as String? ?? json['media_kind'] as String?,
      ),
      url: json['url'] as String?,
    );
  }
}
