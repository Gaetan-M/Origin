/// A single comment on a feed post.
///
/// Plain immutable Dart class (no codegen) so it can round-trip to the
/// Drift-backed offline cache and the offline write queue.
class FeedComment {
  const FeedComment({
    required this.id,
    required this.feedPostId,
    required this.accountId,
    required this.body,
    required this.createdAt,
    this.authorDisplayName,
    this.authorPhotoUrl,
    this.pending = false,
  });

  final String id;
  final String feedPostId;
  final String accountId;
  final String body;
  final DateTime createdAt;
  final String? authorDisplayName;
  final String? authorPhotoUrl;

  /// True when authored offline and awaiting push.
  final bool pending;

  FeedComment copyWith({String? id, bool? pending}) {
    return FeedComment(
      id: id ?? this.id,
      feedPostId: feedPostId,
      accountId: accountId,
      body: body,
      createdAt: createdAt,
      authorDisplayName: authorDisplayName,
      authorPhotoUrl: authorPhotoUrl,
      pending: pending ?? this.pending,
    );
  }

  factory FeedComment.fromJson(Map<String, dynamic> json) {
    final author = json['author'] as Map<String, dynamic>?;
    return FeedComment(
      id: json['id'] as String,
      feedPostId: json['feedPostId'] as String? ??
          json['feed_post_id'] as String? ??
          '',
      accountId: json['accountId'] as String? ??
          json['account_id'] as String? ??
          author?['id'] as String? ??
          '',
      body: json['body'] as String? ?? '',
      createdAt:
          DateTime.tryParse('${json['createdAt'] ?? json['created_at']}') ??
              DateTime.now().toUtc(),
      authorDisplayName:
          author?['displayName'] as String? ?? author?['fullName'] as String?,
      authorPhotoUrl: author?['photoUrl'] as String?,
      pending: json['pending'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return <String, dynamic>{
      'id': id,
      'feedPostId': feedPostId,
      'accountId': accountId,
      'body': body,
      'createdAt': createdAt.toIso8601String(),
      'authorDisplayName': authorDisplayName,
      'authorPhotoUrl': authorPhotoUrl,
      'pending': pending,
    };
  }
}
