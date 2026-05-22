export default function PageLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-32">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent"
        aria-hidden
      />
      <p className="mt-4 text-sm font-medium text-zinc-600">Cargando...</p>
    </div>
  );
}
