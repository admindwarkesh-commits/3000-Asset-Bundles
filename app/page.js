import HomePage from "../components/HomePage";
import { getStoreOrDefaults } from "../lib/store";

export const dynamic = "force-dynamic";

export default async function Page() {
  const store = await getStoreOrDefaults();
  return (
    <HomePage
      price={store.priceInr}
      productName={store.productName}
      testMode={store.activeMode !== "live"}
    />
  );
}
