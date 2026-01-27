"use client"

/**
 * HeroResearchMock - Back layer mockup showing research/code interface
 * Part of the two-layer hero mockup design
 */
export function HeroResearchMock() {
  return (
    <div className="hero-mockup layer-back">
      {/* Browser Header */}
      <div className="mock-header">
        <div className="mock-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div className="mock-url">makalah.ai/chat</div>
      </div>

      {/* Code Content */}
      <div className="mock-content">
        <div className="code-block">
          <span className="code-comment">{"// Agent is processing..."}</span>
          <br />
          <span className="code-keyword">const</span> paper ={" "}
          <span className="code-keyword">await</span> MakalahAI.
          <span className="code-func">research</span>({"{"})
          <br />
          &nbsp;&nbsp;topic:{" "}
          <span className="code-str">&quot;Dampak AI pada Integritas Akademik&quot;</span>,
          <br />
          &nbsp;&nbsp;depth: <span className="code-str">&quot;deep-scan&quot;</span>
          <br />
          {"}"});
        </div>
      </div>
    </div>
  )
}
