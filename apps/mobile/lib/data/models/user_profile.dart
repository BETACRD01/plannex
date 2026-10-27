class UserProfile {
  final String id;
  final String email;
  final String? fullName;
  final String role; // 'admin', 'asesor', 'cliente'
  final String? documentId;
  final String? phone;

  UserProfile({
    required this.id,
    required this.email,
    this.fullName,
    required this.role,
    this.documentId,
    this.phone,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json, {String? fallbackEmail}) {
    return UserProfile(
      id: json['id'] as String,
      email: (json['email'] as String?) ?? fallbackEmail ?? '',
      fullName: json['full_name'] as String?,
      role: (json['role'] as String?) ?? 'cliente',
      documentId: json['document_id'] as String?,
      phone: json['phone'] as String?,
    );
  }
}
