type ServiceCardProps = {
  title: string;
  description: string;
  topics: string[];
};

function ServiceCard({
  title,
  description,
  topics,
}: ServiceCardProps) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <h3 className="text-xl font-semibold text-white">{title}</h3>

      <p className="mt-3 leading-7 text-slate-300">
        {description}
      </p>

      <ul className="mt-5 space-y-2 text-sm text-slate-400">
        {topics.map((topic) => (
          <li key={topic} className="flex gap-2">
            <span className="text-blue-400">•</span>
            <span>{topic}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default function Services() {
  return (
    <section
      id="services"
      className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24"
    >
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
          Services
        </p>

        <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Tutoring built around each student’s goals.
        </h2>

        <p className="mt-5 text-lg leading-8 text-slate-300">
          Lessons can focus on competition preparation, deeper mathematical
          understanding, or targeted improvement in specific problem areas.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ServiceCard
          title="Competition Preparation"
          description="Structured preparation for students working toward stronger contest results."
          topics={[
            "Mathcounts preparation",
            "AMC 8, AMC 10, AMC 12, and AIME",
            "Improve accuracy and test strategy",
          ]}
        />

        <ServiceCard
          title="Problem-Solving Development"
          description="Build the habits and techniques needed to approach unfamiliar problems confidently."
          topics={[
            "Algebra and Number Theory",
            "Geometry",
            "Counting and Probability",
          ]}
        />

        <ServiceCard
          title="Personalized Coaching"
          description="Individual lessons adapted to the student’s current level, pace, and long-term goals."
          topics={[
            "Customized lesson plans",
            "Review of missed problems",
            "Homework and progress guidance",
          ]}
        />
      </div>
    </section>
  );
}