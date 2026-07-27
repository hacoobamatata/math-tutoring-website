export default function About() {
  return (
    <section
      id="about"
      className="scroll-mt-20 border-y border-slate-800 bg-slate-900"
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
            About Me
          </p>

          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Competition math experience paired with patient, personalized
            teaching.
          </h2>

          <p className="mt-6 max-w-md text-base leading-7 text-slate-400">
            I bring years of experience as a competitor, team captain, problem writer,
            and one-on-one tutor to every lesson.
          </p>
        </div>

        <div className="space-y-5 text-lg leading-8 text-slate-300">
          <p>
            I’m a Computer Science student at the University of Michigan and a
            former USAJMO qualifier with years of experience in competition
            mathematics.
          </p>

          <p>
            As captain of the Lexington High School math team, I helped lead
            one of the nation&apos;s strongest teams while continuing to develop
            my own problem-solving skills.
          </p>

          <p>
            Beyond competing, I&apos;ve enjoyed giving back to the competition
            math community by organizing and writing original problems for the
            Lexington Math Tournament and by contributing as a problem writer
            and organizer for the Michigan Math Meet.
          </p>

          <p>
            Through private one-on-one tutoring, I help students build
            mathematical intuition, confidence, and lasting problem-solving
            skills.
          </p>
        </div>
      </div>
    </section>
  );
}