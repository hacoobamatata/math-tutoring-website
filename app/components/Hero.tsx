export default function Hero() {
  return (
    <section
      id="home"
      className="mx-auto flex min-h-screen max-w-6xl scroll-mt-20 items-center px-6 py-28"
    >
      <div className="max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
          Online Competition Math Tutoring
        </p>

        <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
          Build stronger problem-solving skills—not just faster answers.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
          Personalized coaching for students preparing for Mathcounts, AMC 8, AMC 10,
          AMC 12, AIME, and other math challenges.
        </p>

        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <a
            href="#contact"
            className="rounded-lg bg-blue-600 px-6 py-3 text-center font-semibold text-white transition hover:bg-blue-500"
          >
            Request a Lesson
          </a>

          <a
            href="#about"
            className="rounded-lg border border-slate-700 px-6 py-3 text-center font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900"
          >
            Learn More
          </a>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <Credential
            title="USAJMO Qualifier"
            description="Firsthand experience with advanced competition mathematics."
          />

          <Credential
            title="University of Michigan CS"
            description="Computer Science student at the University of Michigan."
          />

          <Credential
            title="Experienced Tutor"
            description="Years of working with students through challenging material."
          />
        </div>
      </div>
    </section>
  );
}

type CredentialProps = {
  title: string;
  description: string;
};

function Credential({ title, description }: CredentialProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}