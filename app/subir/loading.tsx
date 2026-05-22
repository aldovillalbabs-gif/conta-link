import NavContador from "@/components/NavContador";
import PageLoading from "@/components/PageLoading";

export default function SubirLoading() {
  return (
    <div className="min-h-screen bg-white">
      <NavContador />
      <PageLoading />
    </div>
  );
}
