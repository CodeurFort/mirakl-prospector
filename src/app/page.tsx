import SellerTable from "@/components/SellerTable";

export default function DashboardPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard Sellers</h1>
        <p className="text-muted mt-1">
          Sellers identifiés et scorés pour Mirakl Connect
        </p>
      </div>
      <SellerTable />
    </div>
  );
}
