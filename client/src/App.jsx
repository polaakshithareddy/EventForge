import { useEffect } from 'react';
import AppRoutes from './routes';
import useAuthStore from './store/authStore';
import { getMe } from './api/auth';

function App() {
  const { setUser, clearUser, setLoading } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await getMe();
        setUser(response.data.user);
      } catch (error) {
        clearUser();
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, [setUser, clearUser, setLoading]);

  return <AppRoutes />;
}

export default App;
