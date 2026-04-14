export default function Home() {
  return (
    <main className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="max-w-lg w-full mx-4 text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
            Volleyball Club Bot
          </h1>
          <p className="text-lg text-gray-500">
            Automated FAQ chatbot for our social volleyball club
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 text-left space-y-4">
          <h2 className="font-semibold text-gray-900">How it works</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="text-blue-500 font-bold shrink-0">1.</span>
              Send us a message on Facebook or Instagram
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 font-bold shrink-0">2.</span>
              Our bot classifies your question automatically
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 font-bold shrink-0">3.</span>
              You get an instant answer from our FAQ database
            </li>
            <li className="flex gap-2">
              <span className="text-blue-500 font-bold shrink-0">4.</span>
              Can&apos;t answer? A human will follow up with you
            </li>
          </ul>
        </div>

        <div className="flex gap-3 justify-center">
          <a
            href="/admin"
            className="text-sm text-gray-500 hover:text-gray-700 underline transition"
          >
            Admin Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
