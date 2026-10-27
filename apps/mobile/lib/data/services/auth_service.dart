import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/user_profile.dart';

class AuthService {
  final SupabaseClient _client = Supabase.instance.client;

  User? get currentUser => _client.auth.currentUser;
  Session? get currentSession => _client.auth.currentSession;
  Stream<AuthState> get authStateChanges => _client.auth.onAuthStateChange;

  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    return await _client.auth.signInWithPassword(
      email: email.trim(),
      password: password,
    );
  }

  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  Future<UserProfile?> fetchProfile(String userId) async {
    try {
      final response = await _client
          .from('profiles')
          .select()
          .eq('id', userId)
          .maybeSingle();

      if (response == null) {
        return UserProfile(
          id: userId,
          email: currentUser?.email ?? '',
          role: 'cliente',
        );
      }

      return UserProfile.fromJson(
        response,
        fallbackEmail: currentUser?.email,
      );
    } catch (_) {
      return UserProfile(
        id: userId,
        email: currentUser?.email ?? '',
        role: 'cliente',
      );
    }
  }
}
