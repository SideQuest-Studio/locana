"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import {
  MapPin,
  Calendar,
  Users,
  Compass,
  Search,
  Star,
  CheckCircle2,
  Leaf,
  ArrowRight,
  ChevronRight,
  Menu,
  X,
  ShieldCheck,
  Award,
  Sparkles,
  Info,
  CalendarCheck,
  Check,
  AlertCircle
} from "lucide-react";

interface Attraction {
  id: string;
  name: string;
  location: string;
  category: "beaches" | "mountains" | "waterfalls" | "forests";
  rating: number;
  reviewsCount: number;
  price: number;
  description: string;
  image: string;
  tags: string[];
  highlights: string[];
  ecoContribution: string;
}

const ATTRACTIONS: Attraction[] = [
  {
    id: "el-nido",
    name: "Kayangan & Twin Lagoons Nature Trek",
    location: "El Nido, Palawan",
    category: "beaches",
    rating: 4.9,
    reviewsCount: 4820,
    price: 1500,
    description: "Swim in crystal-clear emerald waters, enclosed by majestic karst limestone formations that date back 250 million years.",
    image: "/hero.jpg",
    tags: ["Marine Protected", "Zero-Plastic", "Guided Swim"],
    highlights: ["Symmetrical limestone walls", "Hidden saltwater lagoons", "Coral reef restoration zones"],
    ecoContribution: "15% of fee supports the Palawan Marine Biodiversity Fund."
  },
  {
    id: "batanes-hills",
    name: "Marlboro Hills Scenic Wind Trek",
    location: "Basco, Batanes",
    category: "mountains",
    rating: 4.95,
    reviewsCount: 1240,
    price: 2200,
    description: "Witness rolling green hills meeting the Pacific ocean winds, grazing cattle, and traditional stone houses designed to withstand typhoons.",
    image: "/batanes.jpg",
    tags: ["Indigenous Heritage", "Eco-Trekking", "Restricted Access"],
    highlights: ["360° Pacific ocean views", "Traditional Ivatan guide", "Local organic lunch inclusion"],
    ecoContribution: "15% of fee funds Batanes Ivatan Cultural Heritage Foundation."
  },
  {
    id: "siargao-canopy",
    name: "Coconut Canopy & Maasin River Paddle",
    location: "General Luna, Siargao",
    category: "forests",
    rating: 4.88,
    reviewsCount: 2850,
    price: 1100,
    description: "Paddle along the tranquil waters of Maasin River, shaded by a breathtaking canopy of thousands of coconut palms.",
    image: "/siargao.jpg",
    tags: ["Low Carbon", "Local Outriggers", "Tree Planting"],
    highlights: ["Traditional hand-carved canoe", "Bent palm tree swing climb", "Mangrove reforestation site visit"],
    ecoContribution: "15% of fee goes to Siargao Mangrove Planting Association."
  },
  {
    id: "kawasan-falls",
    name: "Kawasan Emerald Falls & Canyon Expedition",
    location: "Badian, Cebu",
    category: "waterfalls",
    rating: 4.92,
    reviewsCount: 5120,
    price: 1800,
    description: "Explore lush jungle canyons, leap into natural rock pools, and float down Cebu's famous multi-tiered turquoise Kawasan falls.",
    image: "/kawasan.jpg",
    tags: ["Community Led", "Safety Certified", "Nature Recovery"],
    highlights: ["Multi-tier canyon jump spots", "Natural water slide formations", "Water purification filter program Support"],
    ecoContribution: "15% of fee goes to Badian River Watershed Conservation Council."
  }
];

export default function LandingPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Search form state
  const [searchLocation, setSearchLocation] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");
  const [searchDate, setSearchDate] = useState("");
  const [searchGuests, setSearchGuests] = useState("1");
  const [searchResultsMsg, setSearchResultsMsg] = useState<string | null>(null);

  // Booking modal state
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null);
  const [bookingStep, setBookingStep] = useState<"details" | "submitting" | "success">("details");
  const [bookName, setBookName] = useState("");
  const [bookEmail, setBookEmail] = useState("");
  const [bookDate, setBookDate] = useState("");
  const [bookGuests, setBookGuests] = useState(1);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Quiz state
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [quizRecommendation, setQuizRecommendation] = useState<Attraction | null>(null);

  // FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let count = 0;

    ATTRACTIONS.forEach(attraction => {
      const matchLoc = !searchLocation || attraction.location.toLowerCase().includes(searchLocation.toLowerCase());
      const matchCat = searchCategory === "all" || attraction.category === searchCategory;
      if (matchLoc && matchCat) {
        count++;
      }
    });

    setSearchResultsMsg(`Found ${count} eco-attractions matching your filters. See selections below.`);
    setTimeout(() => setSearchResultsMsg(null), 5000);
  };

  const openBookingModal = (attraction: Attraction) => {
    setSelectedAttraction(attraction);
    setBookDate(searchDate || new Date(Date.now() + 86400000).toISOString().split("T")[0]);
    setBookGuests(Number(searchGuests) || 1);
    setBookingStep("details");
    setBookName("");
    setBookEmail("");
    setAgreeTerms(false);
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookName || !bookEmail || !bookDate || !agreeTerms) return;

    setBookingStep("submitting");
    setTimeout(() => {
      setBookingStep("success");
    }, 1500);
  };

  // Quiz questions
  const quizQuestions = [
    {
      question: "What sensory element connects best with your recovery goals?",
      options: [
        { text: "Rhythmic tides, warm sand, and crystal salt water", value: "beaches" },
        { text: "Highland mist, cool wind, and endless pastures", value: "mountains" },
        { text: "Cascading forest waterfalls and shaded jungle swim", value: "waterfalls" },
        { text: "A slow paddle under coconut palms along winding rivers", value: "forests" }
      ]
    },
    {
      question: "What level of movement are you seeking?",
      options: [
        { text: "Minimal effort – floating, deep quiet, and contemplation", value: "chill" },
        { text: "Moderate pacing – strolls, light heritage trails, photography", value: "moderate" },
        { text: "Active adventure – canyoneering, coastal trekking, climbing", value: "active" }
      ]
    },
    {
      question: "Who will share this nature-immersion slot?",
      options: [
        { text: "Solo – seeking quiet recovery and solitude", value: "solo" },
        { text: "A partner – looking to reconnect in peaceful silence", value: "couple" },
        { text: "Family / group – bonding through eco-conscious activities", value: "group" }
      ]
    }
  ];

  const handleQuizAnswer = (value: string) => {
    const nextAnswers = [...quizAnswers, value];
    setQuizAnswers(nextAnswers);

    if (quizQuestionIndex < quizQuestions.length - 1) {
      setQuizQuestionIndex(quizQuestionIndex + 1);
    } else {
      const targetCategory = nextAnswers[0];
      const matched = ATTRACTIONS.find(a => a.category === targetCategory) || ATTRACTIONS[0];
      setQuizRecommendation(matched);
      setQuizQuestionIndex(quizQuestions.length);
    }
  };

  const resetQuiz = () => {
    setQuizAnswers([]);
    setQuizQuestionIndex(0);
    setQuizRecommendation(null);
    setQuizStarted(true);
  };

  const filteredAttractions = useMemo(() => {
    return ATTRACTIONS.filter(a => activeCategory === "all" || a.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className="min-h-screen bg-[#fbfdfc] text-[#1e2925] font-sans antialiased flex flex-col">

      {/* Navigation Header */}
      <nav className="sticky top-0 z-40 bg-white border-b border-slate-100/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="bg-teal-700 text-white p-1.5 rounded-lg">
                <Leaf className="h-5 w-5" />
              </div>
              <div className="flex items-center">
                <span className="text-xl font-bold tracking-tight text-slate-800">
                  Locana
                </span>
                <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                  PH
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#destinations" className="text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-teal-750 transition-colors">
                Destinations
              </a>
              <a href="#quiz" className="text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-teal-750 transition-colors">
                Nature Escape Quiz
              </a>
              <a href="#how-it-works" className="text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-teal-750 transition-colors">
                How It Works
              </a>
              <a href="#eco-impact" className="text-xs font-semibold uppercase tracking-wider text-slate-600 hover:text-teal-750 transition-colors">
                Eco-Impact
              </a>
            </div>

            {/* Actions */}
            <div className="hidden md:flex items-center gap-4">
              <a
                href="#destinations"
                className="inline-flex items-center justify-center px-4 py-2 border border-slate-200 hover:border-teal-700 rounded-lg text-xs font-semibold text-slate-700 hover:text-teal-750 bg-white hover:bg-slate-50 transition-all active:scale-[0.98]"
              >
                Book An Escape
              </a>
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-100 px-4 py-4 flex flex-col gap-3">
            <a
              href="#destinations"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Destinations
            </a>
            <a
              href="#quiz"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Nature Escape Quiz
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#eco-impact"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Eco-Impact
            </a>
            <a
              href="#destinations"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-2 text-center w-full py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold"
            >
              Book An Escape
            </a>
          </div>
        )}
      </nav>

      {/* Hero Section - Split minimal design */}
      <section className="relative bg-white py-16 md:py-24 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            {/* Text details */}
            <div className="lg:col-span-6 flex flex-col items-start">

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-50 border border-slate-200/60 text-slate-500 font-semibold text-[10px] uppercase tracking-wider mb-6">
                <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                <span>Sustainable Philippines Reservations</span>
              </div>

              {/* Tagline */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight mb-4">
                Explore, Discover, Recover <br />
                <span className="text-teal-750 font-serif italic font-normal">and breathe</span> with nature near to you.
              </h1>

              <p className="text-sm sm:text-base text-slate-500 max-w-xl leading-relaxed mb-8">
                Locana connects conscious travelers with certified indigenous tour guides in low-impact, biological preservation areas. Avoid crowds, support local stewards, and breathe in protected spaces.
              </p>

              {/* Minimal Search widget */}
              <div className="w-full bg-[#fbfdfc] border border-slate-200 rounded-xl p-4 shadow-xs">
                <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">

                  {/* Location Selector */}
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-teal-600" /> Destination
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Palawan, Batanes"
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-700"
                    />
                  </div>

                  {/* Category Selector */}
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Compass className="h-3 w-3 text-teal-600" /> Category
                    </label>
                    <select
                      value={searchCategory}
                      onChange={(e) => setSearchCategory(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-700"
                    >
                      <option value="all">All Landscapes</option>
                      <option value="beaches">Beaches & Lagoons</option>
                      <option value="mountains">Mountains & Hills</option>
                      <option value="waterfalls">Waterfalls & Canyons</option>
                      <option value="forests">Palm Canopy</option>
                    </select>
                  </div>

                  {/* Search CTA */}
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2 bg-teal-750 hover:bg-teal-800 text-white rounded-md text-xs font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-1"
                    >
                      <Search className="h-3.5 w-3.5" />
                      <span>Search Options</span>
                    </button>
                  </div>

                </form>

                {/* Toast alerts */}
                {searchResultsMsg && (
                  <div className="mt-3 px-3 py-1.5 bg-teal-50/60 border border-teal-100 text-teal-700 text-[11px] rounded-md flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{searchResultsMsg}</span>
                  </div>
                )}
              </div>

            </div>

            {/* Visual element on right */}
            <div className="lg:col-span-6 relative aspect-video lg:aspect-square w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
              <Image
                src="/hero.jpg"
                alt="El Nido Palawan Lagoon"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 border border-slate-100 rounded-lg p-3 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">Featured Preserve</span>
                  <span className="text-xs font-bold text-slate-800">Twin Lagoons, El Nido</span>
                </div>
                <div className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                  Palawan
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Sustainable Stats Banner */}
      <section className="bg-slate-50/50 border-b border-slate-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <span className="text-xl font-bold text-slate-800 block">50+</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Eco-Attractions</span>
            </div>
            <div>
              <span className="text-xl font-bold text-slate-800 block">10k+ kg</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Carbon Offsets</span>
            </div>
            <div>
              <span className="text-xl font-bold text-slate-800 block">100%</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Community Certified</span>
            </div>
            <div>
              <span className="text-xl font-bold text-slate-800 block">15%</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Direct Conservation Fee</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Attraction Explorer */}
      <section id="destinations" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-6 border-b border-slate-100">
          <div className="max-w-xl">
            <span className="text-[10px] font-bold tracking-wider text-teal-700 uppercase">
              Curated Escapes
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
              Protected Nature Reserves
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              All bookings are capped at strict daily visitor counts. Check availability and secure slots with verified Ivatan, Cebuano, and Palawan local councils.
            </p>
          </div>

          {/* Filtering tabs */}
          <div className="flex flex-wrap gap-1.5 mt-4 md:mt-0">
            {["all", "beaches", "mountains", "waterfalls", "forests"].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded transition-colors duration-250 ${activeCategory === cat
                  ? "bg-teal-750 text-slate-900"
                  : "bg-slate-100 hover:bg-slate-200/70 text-slate-600"
                  }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Attractions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredAttractions.map((attraction) => (
            <article
              key={attraction.id}
              className="bg-white border border-slate-200/70 rounded-xl overflow-hidden shadow-xs hover:border-slate-300 transition-all flex flex-col h-full group"
            >
              {/* Card Image Area */}
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                <Image
                  src={attraction.image}
                  alt={attraction.name}
                  fill
                  className="object-cover"
                />

                {/* Rating Badge */}
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded bg-white/95 border border-slate-100 text-[10px] font-bold text-slate-800">
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  <span>{attraction.rating}</span>
                </div>
              </div>

              {/* Card Details */}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-center gap-1 text-slate-450 text-[10px] font-bold uppercase tracking-wider">
                  <MapPin className="h-3 w-3 text-teal-650" />
                  <span>{attraction.location}</span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 mt-2 block">
                  {attraction.name}
                </h3>

                <p className="text-xs text-slate-500 mt-2 flex-1 leading-relaxed">
                  {attraction.description}
                </p>

                {/* Highlights Tags */}
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {attraction.tags.slice(0, 2).map((t, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-slate-50 text-slate-500 border border-slate-200/50"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <hr className="border-slate-100 my-4" />

                {/* Price and Action */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Pass Fee</span>
                    <span className="text-sm font-bold text-slate-800">
                      ₱{attraction.price.toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={() => openBookingModal(attraction)}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 border border-slate-200 hover:border-teal-700 hover:bg-slate-50 text-slate-700 hover:text-teal-750 text-xs font-semibold rounded-md transition-all"
                  >
                    <span>Reserve Slot</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Interactive Nature Matcher Quiz */}
      <section id="quiz" className="py-20 bg-slate-50 border-y border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

          <span className="text-[10px] font-bold tracking-wider text-teal-700 uppercase">
            Recommendation Tool
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
            Determine Your Nature Escape
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto mt-2 mb-8">
            Align your physical endurance and relaxation style with a verified local reservation area. Takes 30 seconds.
          </p>

          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 max-w-xl mx-auto min-h-[250px] flex flex-col justify-center text-left">

            {/* Quiz landing state */}
            {!quizStarted && (
              <div className="text-center flex flex-col items-center">
                <Compass className="h-10 w-10 text-teal-750 mb-4" />
                <h3 className="text-sm font-bold text-slate-800">Start the Assessment</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1.5 mb-6 leading-relaxed">
                  We'll evaluate your energy, budget, and environmental footprint to match you with the appropriate sanctuary island.
                </p>
                <button
                  onClick={() => setQuizStarted(true)}
                  className="px-6 py-2 bg-teal-750 hover:bg-teal-800 text-white text-xs font-semibold rounded-md"
                >
                  Start Quiz
                </button>
              </div>
            )}

            {/* Quiz questioning state */}
            {quizStarted && quizQuestionIndex < quizQuestions.length && (
              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase mb-4">
                  <span>Step {quizQuestionIndex + 1} of {quizQuestions.length}</span>
                </div>

                <h3 className="text-sm font-bold text-slate-800 mb-4 leading-tight">
                  {quizQuestions[quizQuestionIndex].question}
                </h3>

                <div className="flex flex-col gap-2">
                  {quizQuestions[quizQuestionIndex].options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleQuizAnswer(opt.value)}
                      className="w-full text-left p-3 text-xs font-medium rounded border border-slate-200 hover:border-teal-700 hover:bg-slate-50 transition-colors flex items-center justify-between"
                    >
                      <span>{opt.text}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quiz result/recommendation state */}
            {quizStarted && quizQuestionIndex === quizQuestions.length && quizRecommendation && (
              <div className="text-center flex flex-col items-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded">
                  Calculated Target Preserve
                </span>

                <h3 className="text-base font-bold text-slate-900 mt-2 mb-4">
                  {quizRecommendation.name}
                </h3>

                {/* Match Card */}
                <div className="w-full border border-slate-200 rounded-lg overflow-hidden flex flex-col sm:flex-row bg-slate-50 text-left mb-6">
                  <div className="relative w-full sm:w-[130px] h-[95px] shrink-0 bg-slate-100">
                    <Image
                      src={quizRecommendation.image}
                      alt={quizRecommendation.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="p-3.5 flex flex-col justify-between flex-1">
                    <div>
                      <span className="text-[10px] font-bold text-teal-750 flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5" /> {quizRecommendation.location}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {quizRecommendation.description}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-700 mt-2 block">
                      ₱{quizRecommendation.price.toLocaleString()} pass fee
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 justify-end w-full">
                  <button
                    onClick={resetQuiz}
                    className="px-4 py-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold"
                  >
                    Retake
                  </button>
                  <button
                    onClick={() => openBookingModal(quizRecommendation)}
                    className="px-4 py-1.5 bg-teal-750 hover:bg-teal-800 text-white text-xs font-semibold rounded"
                  >
                    Confirm Booking
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* How It Works Section - Minimal */}
      <section id="how-it-works" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-[10px] font-bold tracking-wider text-teal-700 uppercase">
            Platform Workflow
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
            Booking & Stewardship Protocol
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Step 1 */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-left">
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded block w-fit mb-4">
              Step 01
            </span>
            <h3 className="font-bold text-sm text-slate-800">Identify Sanctuary</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Explore catalog zones or match with a landscape category using our recommendation quiz.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-left">
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded block w-fit mb-4">
              Step 02
            </span>
            <h3 className="font-bold text-sm text-slate-800">Check Dynamic Quota</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Specify travelers and dates. Our database limits entries to protect local microclimates.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-left">
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded block w-fit mb-4">
              Step 03
            </span>
            <h3 className="font-bold text-sm text-slate-800">Verify Carbon Pass</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Complete reservation. Get your paperless QR confirmation and coordinator details.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-left">
            <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded block w-fit mb-4">
              Step 04
            </span>
            <h3 className="font-bold text-sm text-slate-800">Stewardship Trek</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Meet your native certified guide. Enjoy nature, carry out plastics, leave no physical trace.
            </p>
          </div>
        </div>
      </section>

      {/* Community & Eco Impact Showcase */}
      <section id="eco-impact" className="py-20 bg-[#f4f7f5] border-t border-slate-250/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                Stewardship Pact
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-1 mb-4">
                Structured Local Conservation Levy
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                Locana channels tourism revenue straight into community restoration. Every ticket price incorporates a transparent 15% regional eco-development levy that goes directly to regional guides, watershed protection, and beach restoration councils.
              </p>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <ShieldCheck className="h-5 w-5 text-teal-650 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Indigenous Guide Council Led</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">Tours are managed by Ivatan, Cebuano, and Palawan native community associations, assuring wages go directly to local families.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Check className="h-5 w-5 text-teal-650 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Zero Commission Model</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">We charge no service fee to local operators. Server overheads are paid directly by carbon-offset corporate partners.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cost Allocation Chart card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Stewardship Pass Fee Breakdown</h3>

              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold text-slate-700">
                    <span>Indigenous Guide & Local Council Pay</span>
                    <span className="text-teal-700 font-bold">75%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-teal-700 h-full rounded-full" style={{ width: "75%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold text-slate-700">
                    <span>Regional Environmental Watershed Levy</span>
                    <span className="text-teal-700 font-bold">15%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-teal-700 h-full rounded-full" style={{ width: "15%" }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-semibold text-slate-700">
                    <span>Biodiversity Restoration Program</span>
                    <span className="text-teal-700 font-bold">10%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-teal-700 h-full rounded-full" style={{ width: "10%" }} />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500 italic">
                "Through Locana's scheduling system, we capped daily visits to Twin Lagoons, resulting in a 40% recovery in coral density in just one season."
                <span className="block font-bold text-[10px] text-slate-700 uppercase tracking-wider mt-2 not-italic">Palawan Marine Biodiversity Committee</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Explorer Testimonials */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-[10px] font-bold tracking-wider text-teal-700 uppercase">
            User Feedback
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
            Stewardship Experiences
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
            <p className="text-xs text-slate-500 leading-relaxed italic mb-6">
              "Booking our Batanes winds trek was seamless. Our Ivatan guide spoke passionately about the grass restoration projects, which made the walk incredibly meaningful."
            </p>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs uppercase">
                MC
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800">Mikaela Cruz</h4>
                <span className="text-[10px] text-slate-400">Manila, Traveler</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
            <p className="text-xs text-slate-500 leading-relaxed italic mb-6">
              "The Nature Escape quiz matching recommended Siargao river canopy. It was exactly the level of peaceful flow my mind needed. Minimal layout, simple verification pass."
            </p>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs uppercase">
                JH
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800">Julian H.</h4>
                <span className="text-[10px] text-slate-400">Singapore, Solo Traveler</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
            <p className="text-xs text-slate-500 leading-relaxed italic mb-6">
              "Breathtaking scenery. Having strict limits on visitor entries at Kawasan Cebu was a game-changer. No crowding, just water, rocks, and trees. Top-tier booking interface."
            </p>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs uppercase">
                RT
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800">Rachel Tan</h4>
                <span className="text-[10px] text-slate-400">Cebu, Outdoor Enthusiast</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-20 bg-slate-50 border-t border-slate-150/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-10">
            <span className="text-[10px] font-bold tracking-wider text-teal-700 uppercase">
              Help Center
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
              General Inquiries
            </h2>
          </div>

          <div className="space-y-3.5 max-w-2xl mx-auto">
            {[
              {
                q: "What makes Locana passes different from conventional tours?",
                a: "Locana bookings are verified directly with regional environmental committees. Every ticket respects maximum daily quotas to avoid overcrowding, and a 15% surcharge directly supports localized preservation cooperatives."
              },
              {
                q: "How do I redeem my booking QR code?",
                a: "Once confirmed, we issue a digital pass to your email and dashboard. Simply display this pass on your phone to your designated community coordinator at the arrival station. Offline modes are supported."
              },
              {
                q: "Are the regional guides verified?",
                a: "Absolutely. All guides on our platform are certified indigenous inhabitants of their respective preserves, trained in wilderness first aid and local historical storytelling."
              },
              {
                q: "What happens during typhoons or inclement weather?",
                a: "Safety is our priority. If the local municipality issues a weather warning, the tour is immediately paused. You will receive a 100% refund or can reschedule at your convenience."
              }
            ].map((faq, index) => (
              <div
                key={index}
                className="bg-white border border-slate-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left font-bold text-slate-800 hover:text-teal-700 transition-colors"
                >
                  <span className="text-xs sm:text-sm">{faq.q}</span>
                  <ChevronRight
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${openFaqIndex === index ? "rotate-90 text-teal-700" : ""
                      }`}
                  />
                </button>
                {openFaqIndex === index && (
                  <div className="px-4 pb-4 pt-0 text-xs text-slate-500 leading-relaxed border-t border-slate-50">
                    <p className="mt-3">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white text-slate-600 border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">

            {/* Column 1 - Brand Info */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="bg-teal-750 text-white p-1 rounded">
                  <Leaf className="h-4 w-4" />
                </div>
                <span className="text-lg font-bold text-slate-800">Locana</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                "Explore, Discover, Recover and breathe with nature near to you." Enabling conscious nature bookings across the Philippine islands.
              </p>
            </div>

            {/* Column 2 - Links */}
            <div>
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-3">Explore Preserves</h4>
              <ul className="space-y-1.5 text-xs">
                <li><a href="#destinations" className="hover:text-teal-700 transition-colors">Palawan Lagoons</a></li>
                <li><a href="#destinations" className="hover:text-teal-700 transition-colors">Batanes Hills</a></li>
                <li><a href="#destinations" className="hover:text-teal-700 transition-colors">Siargao Coconut Canopy</a></li>
                <li><a href="#destinations" className="hover:text-teal-700 transition-colors">Cebu Kawasan Waterfalls</a></li>
              </ul>
            </div>

            {/* Column 3 - Eco-Pact */}
            <div>
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-3">Eco Standards</h4>
              <ul className="space-y-1.5 text-xs">
                <li><a href="#eco-impact" className="hover:text-teal-700 transition-colors">Stewardship Levy Model</a></li>
                <li><a href="#eco-impact" className="hover:text-teal-700 transition-colors">Indigenous Guides Council</a></li>
                <li><a href="#eco-impact" className="hover:text-teal-700 transition-colors">Biodiversity Restorations</a></li>
                <li><a href="#eco-impact" className="hover:text-teal-700 transition-colors">Sustainable Tourism Pact</a></li>
              </ul>
            </div>

            {/* Column 4 - Newsletter */}
            <div>
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-3">Stay Connected</h4>
              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                Subscribe to receive seasonal eco-updates and guide recommendations.
              </p>
              <form onSubmit={(e) => { e.preventDefault(); alert("Eco Newsletter subscribed! Let's protect our nature together."); }} className="flex gap-1.5">
                <input
                  type="email"
                  required
                  placeholder="traveler@email.com"
                  className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-teal-700 text-slate-800 placeholder-slate-400 flex-1"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1 bg-teal-750 hover:bg-teal-800 text-white rounded text-xs font-semibold"
                >
                  Join
                </button>
              </form>
            </div>

          </div>

          <hr className="border-slate-100 mb-6" />

          {/* Bottom */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-slate-400">
            <div>
              &copy; {new Date().getFullYear()} Locana Philippines. All nature reserves reserved.
            </div>
            <div className="flex gap-4">
              <a href="#" className="hover:text-slate-600 transition-colors">Privacy</a>
              <a href="#" className="hover:text-slate-600 transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-slate-600 transition-colors">Eco Agreement</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Booking Checkout Modal (Overlay) */}
      {selectedAttraction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">

          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl overflow-hidden modal-shadow relative">

            {/* Close Button */}
            <button
              onClick={() => setSelectedAttraction(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors z-10"
              aria-label="Close modal"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Modal Contents based on booking steps */}
            {bookingStep === "details" && (
              <form onSubmit={handleConfirmBooking}>
                <div className="p-6">

                  <span className="text-[9px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 px-2 py-0.5 rounded">
                    Stewardship Pass Reservation
                  </span>

                  <h3 className="text-base font-bold text-slate-800 mt-2">
                    {selectedAttraction.name}
                  </h3>

                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-0.5">
                    <MapPin className="h-3.5 w-3.5 text-teal-650" /> {selectedAttraction.location}
                  </p>

                  <div className="space-y-4 mt-6">

                    {/* Quota Limit Info */}
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-lg flex gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">
                        Daily entries for this preserve are restricted by municipal council quotas. Slots are reserved temporarily.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {/* Name */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                        <input
                          type="text"
                          required
                          value={bookName}
                          onChange={(e) => setBookName(e.target.value)}
                          placeholder="Juan Dela Cruz"
                          className="w-full bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-750"
                        />
                      </div>

                      {/* Email */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                        <input
                          type="email"
                          required
                          value={bookEmail}
                          onChange={(e) => setBookEmail(e.target.value)}
                          placeholder="juan@email.com"
                          className="w-full bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-750"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Date */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trek Date</label>
                          <input
                            type="date"
                            required
                            value={bookDate}
                            onChange={(e) => setBookDate(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-750"
                          />
                        </div>

                        {/* Guests */}
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Explorers Count</label>
                          <input
                            type="number"
                            min="1"
                            max="8"
                            required
                            value={bookGuests}
                            onChange={(e) => setBookGuests(Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-teal-750"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Pricing breakdown */}
                    <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-lg text-xs space-y-2">
                      <div className="flex justify-between text-slate-500">
                        <span>Base Pass (₱{selectedAttraction.price.toLocaleString()} x {bookGuests})</span>
                        <span>₱{(selectedAttraction.price * bookGuests).toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between text-slate-500 items-center">
                        <span className="flex items-center gap-0.5">
                          Conservation Levy (15%) <span className="inline-flex items-center cursor-help text-teal-600" title={selectedAttraction.ecoContribution}><Info className="h-3 w-3" /></span>
                        </span>
                        <span className="text-teal-700 font-semibold">+₱{(selectedAttraction.price * bookGuests * 0.15).toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between text-slate-500">
                        <span>Guide Honorarium</span>
                        <span className="text-teal-700 font-semibold">Included</span>
                      </div>

                      <hr className="border-slate-200 my-1" />

                      <div className="flex justify-between font-bold text-xs text-slate-800">
                        <span>Total Stewarded Pass Cost</span>
                        <span className="text-teal-700">
                          ₱{(selectedAttraction.price * bookGuests * 1.15).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Pledge Checkbox */}
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        required
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                      />
                      <span className="text-[10px] text-slate-500 leading-relaxed">
                        I pledge to respect Ivatan/local rules: pack out my plastic wrappers, use reef-safe sunscreen, and stay on designated walking paths.
                      </span>
                    </label>

                  </div>

                  <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedAttraction(null)}
                      className="px-4 py-1.5 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-teal-750 hover:bg-teal-800 text-slate-950 text-xs font-semibold rounded"
                    >
                      Confirm Pass
                    </button>
                  </div>

                </div>
              </form>
            )}

            {/* Submitting step */}
            {bookingStep === "submitting" && (
              <div className="p-12 flex flex-col items-center justify-center text-center min-h-[300px]">
                <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-teal-750 animate-spin" />
                <h3 className="text-xs font-bold text-slate-800 mt-4">Generating Carbon-Neutral Pass...</h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Assigning slot numbers and locking local guides schedule.
                </p>
              </div>
            )}

            {/* Success step */}
            {bookingStep === "success" && (
              <div className="p-8 text-center flex flex-col items-center justify-center min-h-[350px]">
                <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-750 flex items-center justify-center mb-4">
                  <CalendarCheck className="h-5 w-5" />
                </div>

                <span className="text-[9px] font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded uppercase tracking-wider">
                  Pass Confirmed
                </span>

                <h3 className="text-base font-bold text-slate-900 mt-2">
                  Pass Secured for {selectedAttraction.name}
                </h3>

                <p className="text-xs text-slate-500 max-w-xs mt-2 leading-relaxed">
                  Thank you <strong>{bookName}</strong>. Your QR Pass has been sent to <strong>{bookEmail}</strong> for <strong>{bookGuests} explorer(s)</strong> on <strong>{bookDate}</strong>.
                </p>

                {/* Micro receipt details */}
                <div className="w-full my-5 p-3 rounded bg-slate-50 border border-slate-200 text-left text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Pass Verification ID:</span>
                    <span className="font-mono font-bold text-slate-800">LOC-{Math.floor(Math.random() * 900000 + 100000)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Levy Surcharge (15%):</span>
                    <span className="text-teal-700 font-bold">₱{(selectedAttraction.price * bookGuests * 0.15).toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-3 bg-teal-50/50 rounded border border-teal-150 text-[10px] text-teal-705 leading-normal max-w-xs mb-5">
                  Save this pass offline. Cellular reception is poor in mountain/lagoon valleys to promote nature breathing.
                </div>

                <button
                  onClick={() => setSelectedAttraction(null)}
                  className="w-full py-2 bg-teal-750 hover:bg-teal-800 text-white rounded text-xs font-semibold"
                >
                  Return to Dashboard
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
