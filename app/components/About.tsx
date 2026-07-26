export default function About() {
  return (
    <section
      id="about"
      className="scroll-mt-20 border-y border-slate-800 bg-slate-900"
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
            About Me
          </p>

          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Competition math experience paired with patient, personalized
            teaching.
          </h2>
        </div>

        <div className="space-y-6 text-lg leading-8 text-slate-300">
          <p>
            I’m a Computer Science student at the University of Michigan and a
            former USAJMO qualifier with years of experience in competition
            mathematics.
          </p>

          <p>
            At Lexington High School, I was an active member of the math team
            and competed alongside students who earned strong results at major
            competitions.
          </p>

          <p>
            As a tutor, I focus on helping students understand the ideas behind
            a solution rather than memorizing isolated tricks. Lessons are
            adapted to each student’s goals, strengths, and current level.
          </p>
        </div>
      </div>
    </section>
  );
}