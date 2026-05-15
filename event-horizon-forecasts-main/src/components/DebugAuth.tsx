import { useAuth } from '../lib/auth';

export const DebugAuth = () => {
  const { user, isAdmin, isSuperAdmin } = useAuth();

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-white border-2 border-purple-500 rounded-lg p-4 shadow-lg max-w-sm z-50">
      <h3 className="font-bold text-sm mb-2">🔍 Auth Debug Info</h3>
      <div className="text-xs space-y-1">
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Username:</strong> {user.username}</p>
        <p><strong>Role:</strong> <span className="font-bold text-purple-600">{user.role}</span></p>
        <p><strong>isAdmin():</strong> {isAdmin() ? '✅ Yes' : '❌ No'}</p>
        <p><strong>isSuperAdmin():</strong> {isSuperAdmin() ? '✅ Yes' : '❌ No'}</p>
      </div>
    </div>
  );
};
