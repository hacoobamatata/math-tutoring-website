import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import About from "./components/About";
import Services from "./components/Services";
import ContactForm from "./components/ContactForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <Hero />
      <About />
      <Services />
      <section
        id="contact"
        className="scroll-mt-20 border-t border-slate-800 bg-slate-900"
      >
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="text-3xl font-bold">Request a Lesson</h2>

          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-300">
            Tell me a little about the student, their current math experience,
            and what they would like to work on.
          </p>

          <ContactForm />
        </div>
      </section>
    </main>
  );
}