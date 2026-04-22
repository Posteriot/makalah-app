/* Workflow feature section */

const WorkflowFeatureSection = () => (
  <section id="workflow" className="section-frame">
    <div className="container">
      <Reveal>
        <div className="sec-head">
          <div>
            <div className="sec-eyebrow">
              <span className="l">/ WORKFLOW</span>
            </div>
            <h2 className="sec-title">Pagar ketat<br /><em>di tiap tahap</em></h2>
          </div>
          <p className="sec-desc">
            14 tahap terstruktur dari menggodok gagasan, penentuan topik sampai kesimpulan final. Tiap peralihan tahap dan keputusan butuh konfirmasi kamu — maka konteks terjaga, argumen tidak mengambang.
          </p>
        </div>
      </Reveal>

      <div className="feature-showcase">
        <Reveal delay={2}>
          <ul className="feature-bullets">
            <li><span className="tok">01→04</span>Scoping: topik, pertanyaan riset, keyword map, kerangka teori.</li>
            <li><span className="tok">05→07</span>Research: pencarian literatur, shortlist, tinjauan berkluster.</li>
            <li><span className="tok">08→11</span>Analisis: metodologi, temuan, diskusi, simpulan.</li>
            <li><span className="tok">12→14</span>Polish: refrasa manusiawi &amp; ekspor multi-format.</li>
          </ul>
        </Reveal>
        <Reveal delay={3}>
          <div className="feature-visual" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
            <img src="assets/ilustrasi-workflow.png?bypass-cache=1" alt="Ilustrasi Workflow Makalah AI" style={{ maxWidth: '100%', height: 'auto', display: 'block', borderRadius: '12px' }} />
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

const WorkflowFeature = WorkflowFeatureSection;

Object.assign(window, { WorkflowFeature, WorkflowFeatureSection });
