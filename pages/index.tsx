import Head from "next/head";
import Chat from "../components/Chat";
import { useAuth } from "../contexts/AuthContext";

export default function Home() {
  const { user, signInWithGoogle, logout } = useAuth();

  return (
    <div className="flex flex-col h-screen bg-[#F5F8FA]">
      <Head>
        <title>Nigerian Constitution AI Chat</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="description" content="AI-powered chat application for understanding the Nigerian Constitution" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Hide header on mobile */}
      <header className="hidden md:block sticky top-0 z-50 bg-white border-b border-[#E1E8ED]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-[#008751]">
            Nigerian Constitution AI Assistant
          </h1>
          {user ? (
            <div className="flex items-center space-x-4">
              <span className="text-[#657786]">{user.displayName}</span>
              <button
                onClick={() => logout()}
                className="px-4 py-2 rounded-full border border-[#E1E8ED] hover:bg-[#F5F8FA] transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => signInWithGoogle()}
              className="px-4 py-2 rounded-full bg-[#008751] text-white hover:bg-opacity-90 transition-colors"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </header>

      {/* Main content - adjust padding and height for mobile */}
      <main className="flex-1 flex w-full h-full overflow-hidden">
        <div className="w-full h-full">
          {!user ? (
            <div className="bg-white md:rounded-xl shadow-sm p-6 text-center m-0 md:m-4 h-full flex flex-col items-center justify-center">
              <p className="text-[#657786] text-lg mb-6">
                Please sign in to start chatting about the Nigerian Constitution
              </p>
              <button
                onClick={() => signInWithGoogle()}
                className="px-4 py-2 rounded-full bg-[#008751] text-white hover:bg-opacity-90 transition-colors"
              >
                Sign in with Google
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* <div className="hidden md:block bg-white rounded-xl shadow-sm p-6 mb-6">
                <p className="text-[#657786] text-lg">
                  Welcome! Ask me anything about the Nigerian Constitution and
                  legal matters. I'm here to help you understand your rights and
                  responsibilities.
                </p>
              </div> */}
              <div className="flex-1 h-[calc(100vh-64px)] md:h-full">
                <Chat />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Hide footer on mobile */}
      <footer className="hidden md:block mt-auto border-t border-[#E1E8ED] bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 text-center text-[#657786]">
          <p>© 2024 Nigerian Constitution AI Chat. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
