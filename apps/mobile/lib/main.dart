import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/config/supabase_config.dart';
import 'core/theme/app_theme.dart';
import 'data/models/user_profile.dart';
import 'data/services/auth_service.dart';
import 'presentation/screens/auth/login_screen.dart';
import 'presentation/screens/dashboard/dashboard_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set system UI overlay style
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ),
  );

  // Initialize Supabase
  await Supabase.initialize(
    url: SupabaseConfig.url,
    anonKey: SupabaseConfig.anonKey,
  );

  runApp(const PlannexApp());
}

class PlannexApp extends StatelessWidget {
  const PlannexApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Plannex',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const AuthGate(),
    );
  }
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  final _authService = AuthService();
  UserProfile? _profile;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _checkInitialAuth();
    _authService.authStateChanges.listen((data) {
      final session = data.session;
      if (session != null) {
        _loadUserProfile(session.user.id);
      } else {
        if (mounted) {
          setState(() {
            _profile = null;
            _isLoading = false;
          });
        }
      }
    });
  }

  Future<void> _checkInitialAuth() async {
    final user = _authService.currentUser;
    if (user != null) {
      await _loadUserProfile(user.id);
    } else {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadUserProfile(String userId) async {
    setState(() => _isLoading = true);
    try {
      final profile = await _authService.fetchProfile(userId);
      if (mounted) {
        setState(() {
          _profile = profile;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: AppTheme.primary),
              SizedBox(height: 16),
              Text(
                'Cargando Plannex...',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textSecondary,
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (_profile != null) {
      return DashboardScreen(
        profile: _profile!,
        onSignOut: () {
          setState(() {
            _profile = null;
          });
        },
      );
    }

    return LoginScreen(
      onLoginSuccess: () {
        final user = _authService.currentUser;
        if (user != null) {
          _loadUserProfile(user.id);
        }
      },
    );
  }
}
