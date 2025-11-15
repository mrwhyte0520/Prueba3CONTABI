import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Usuarios (acceso por rol)
  const [roleEmail, setRoleEmail] = useState('');
  const [roleName, setRoleName] = useState('');
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleMsg, setRoleMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validaciones
    if (!email || !password) {
      setError('Por favor completa todos los campos');
      setLoading(false);
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Por favor ingresa un email válido');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signInError } = await signIn(email, password);

      if (signInError) {
        if (signInError.includes('Invalid login credentials')) {
          setError('Email o contraseña incorrectos');
        } else if (signInError.includes('Email not confirmed')) {
          setError('Por favor confirma tu email antes de iniciar sesión');
        } else {
          setError(signInError);
        }
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Redirigir al dashboard
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError('Error al iniciar sesión. Por favor intenta de nuevo.');
      setLoading(false);
    }
  };

  const handleRoleAccess = async () => {
    setError('');
    setRoleMsg('');
    if (!roleEmail || !roleName) {
      setError('Ingresa email y nombre de rol');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(roleEmail)) {
      setError('Ingresa un email válido');
      return;
    }
    try {
      setRoleLoading(true);
      // Validación rápida contra RBAC local (si existe)
      const roles = JSON.parse(localStorage.getItem('contabi_rbac_roles') || '[]');
      const role = roles.find((r: any) => (r.name || '').toLowerCase() === roleName.toLowerCase());
      if (!role) {
        setError('Rol no encontrado. Verifica el nombre del rol.');
        return;
      }
      const userRoles = JSON.parse(localStorage.getItem('contabi_rbac_user_roles') || '[]');
      const hasAssign = userRoles.some((ur: any) => ur.user_id?.toLowerCase() === roleEmail.toLowerCase() && ur.role_id === role.id);
      if (!hasAssign) {
        // Permitimos continuar, pero avisamos (si usas Supabase, la verificación real será al entrar)
        setRoleMsg('No se encontró asignación local, se enviará enlace de acceso. Los permisos se aplicarán si el rol está asignado en el servidor.');
      }
      // Enviar enlace mágico de acceso
      await supabase.auth.signInWithOtp({ email: roleEmail, options: { emailRedirectTo: window.location.origin + '/dashboard' } });
      setRoleMsg('Te enviamos un enlace de acceso a tu correo. Revisa tu bandeja de entrada.');
    } catch (e) {
      setError('No se pudo enviar el enlace. Intenta de nuevo.');
    } finally {
      setRoleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo y título */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4">
              <i className="ri-shield-user-line text-3xl text-white"></i>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Bienvenido</h1>
            <p className="text-gray-600">Inicia sesión en tu cuenta</p>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
              <i className="ri-error-warning-line text-red-600 text-xl mr-3 mt-0.5"></i>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="ri-mail-line text-gray-400"></i>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="tu@email.com"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <i className="ri-lock-line text-gray-400"></i>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={loading}
                >
                  <i className={`${showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} text-gray-400 hover:text-gray-600`}></i>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                />
                <label htmlFor="remember" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                  Recordarme
                </label>
              </div>
              <Link
                to="/auth/reset-password"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center whitespace-nowrap"
            >
              {loading ? (
                <>
                  <i className="ri-loader-4-line animate-spin mr-2"></i>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <i className="ri-login-box-line mr-2"></i>
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>

          {/* Usuarios: acceso por rol */}
          <div className="mt-8 border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><i className="ri-team-line"></i> Usuarios</h3>
            <p className="text-xs text-gray-500 mb-3">Acceso para subusuarios: ingresa tu email y el nombre del rol asignado por el administrador. Recibirás un enlace mágico.</p>
            {roleMsg && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">{roleMsg}</div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email del usuario</label>
                <input value={roleEmail} onChange={(e)=>setRoleEmail(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="usuario@gmail.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del rol</label>
                <input value={roleName} onChange={(e)=>setRoleName(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Ej. Vendedor" />
              </div>
              <button onClick={handleRoleAccess} disabled={roleLoading} className="w-full bg-slate-800 text-white py-3 px-4 rounded-lg font-medium hover:bg-slate-900 transition-all disabled:opacity-50">
                {roleLoading ? 'Enviando enlace…' : 'Acceso por rol (enlace por email)'}
              </button>
            </div>
          </div>

          {/* Registro */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿No tienes una cuenta?{' '}
              <Link
                to="/auth/register"
                className="font-medium text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            © 2024 Sistema Contable. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
