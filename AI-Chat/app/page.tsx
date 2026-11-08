'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="home-container">
      <div className="home-content">
        <div className="home-header">
          <h1>AI Chat</h1>
          <p>Choose your favorite AI model</p>
        </div>

        <div className="cards-grid">
          <Link href="/llama" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card card-llama">
              <div className="card-emoji">🦙</div>
              <h2 className="card-title">Llama</h2>
              <p className="card-description">
                Fast and powerful text chat
              </p>
              <div className="card-info">
                <p>
                  💬 Natural conversations
                  <br />
                  ⚡ Fast responses
                  <br />
                  🧠 Llama 3.8B model
                </p>
              </div>
            </div>
          </Link>

          <Link href="/llava" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card card-llava">
              <div className="card-emoji">🎨</div>
              <h2 className="card-title">Llava</h2>
              <p className="card-description">
                Vision AI to analyze your images
              </p>
              <div className="card-info">
                <p>
                  🖼️ Image analysis
                  <br />
                  📸 AI vision
                  <br />
                  🎯 Llava 7B model
                </p>
              </div>
            </div>
          </Link>

          <Link href="/gemma" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card card-gemma">
              <div className="card-emoji">✨</div>
              <h2 className="card-title">Gemma</h2>
              <p className="card-description">
                Advanced model for intelligent conversations
              </p>
              <div className="card-info">
                <p>
                  💬 Detailed responses
                  <br />
                  🚀 Powerful model
                  <br />
                  🧠 Gemma 4 12B
                </p>
              </div>
            </div>
          </Link>
        </div>

        <div className="home-footer">
          <p>Powered by Ollama</p>
        </div>
      </div>
    </div>
  );
}
