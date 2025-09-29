import UserAuth from '../UserAuth';

export default function UserAuthExample() {
  const handleLogin = (username: string, displayName: string) => {
    console.log('Login handled:', { username, displayName });
  };

  return <UserAuth onLogin={handleLogin} />;
}