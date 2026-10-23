import ChillPublicApp from '@/components/ChillPublicApp';
import { getChillUser } from '@/lib/chill/current-user';

export default async function ChillPage() {
  const user = await getChillUser();
  return <ChillPublicApp user={user} />;
}
