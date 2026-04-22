import SellerTable from "@/components/SellerTable";

export default function DashboardPage() {
  return (
    <div className="p-8" style={{ maxWidth: 1400 }}>
      <div className="mb-8">
        <h1
          className="font-bold"
          style={{ fontSize: 22, lineHeight: "32px", color: "#03182F", paddingBottom: 8 }}
        >
          Dashboard Sellers
        </h1>
        <p style={{ fontSize: 14, color: "#30373E", lineHeight: "24px" }}>
          Sellers identifiés et scorés pour Mirakl Connect — 7 marketplaces cibles
        </p>
      </div>
      <SellerTable />
    </div>
  );
}
