export default function LoadingSpinner({ text = 'Загрузка...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#6B3FA0] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-500 text-sm">{text}</p>
      </div>
    </div>
  )
}
