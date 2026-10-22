import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import Seo from "../components/Seo";
import { PROJECTS } from "../data/mockData";
import { API_BASE_URL } from "../config";
import { getHubspotContext } from "../utils/hubspotContext";
import { getTrackerPayload } from "../utils/aymenTracker";
import { 
  ReceptionIcon, 
  DomotiqueIcon, 
  ClimatisationIcon, 
  AbattoirIcon, 
  AireDeJeuxIcon 
} from "../components/icons/AmenityIcons";

// --- Amenities Configuration ---
const AMENITIES_ICONS: Record<string, string> = {
  "Climatisation centralisée": "/assets/comodites/climatisation.png",
  "Reception": "/assets/comodites/reception.png",
  "Bache a eau": "/assets/comodites/bache a eau.png",
  "Ascenseur": "/assets/comodites/ascenseur.png",
  "Cuisine": "/assets/comodites/cuisine.png",
  "Groupe electrogene": "/assets/comodites/groupe electrogene.png",
  "Abattoir": "/assets/comodites/abattoir.png",
  "Parking de Stationnement": "/assets/comodites/Parking.png",
  "Parking de stationnement": "/assets/comodites/Parking.png",
  "Domotique": "/assets/comodites/domotique.png",
  "Dressing": "/assets/comodites/dressing.png",
  "Isolation Phonique": "/assets/comodites/isolation phonique.png",
  "Isolation phonique": "/assets/comodites/isolation phonique.png",
  "Fenetre": "/assets/comodites/fenetre.png",
  "Salle d'eau": "/assets/comodites/salle d'eau.png",
  "Piscine Privative": "/assets/comodites/piscine privative.png",
  "Piscine privative": "/assets/comodites/piscine privative.png",
  "Aire de jeux": "/assets/comodites/aire de jeux.png",
  "Salle de sport": "/assets/comodites/salle de sport.png",
  "Spa Hammam Sauna": "/assets/comodites/spa.png",
  "Spa": "/assets/comodites/spa.png",
};

type ProjectData = {
  title: string;
  status: string;
  description: string;
  stats: {
    address: string;
    blocs: string;
    progress: string;
    typologie?: string;
    surface?: string;
  };
  heroImage: string;
  amenities: { label: string; iconSrc?: string; fallbackIcon?: string }[];
  gallery: string[];
  plans: { type: string; area: string; image?: string; rooms?: { name: string; area: string }[] }[];
  location: { mapUrl: string; description: string; mapEmbedUrl?: string };
  virtualTourUrl?: string;
};

type Amenity = {
  label: string;
  iconSrc?: string;
  fallbackIcon?: string;
};
type Plan = ProjectData["plans"][0];
type LocationData = ProjectData["location"];

export default function ProjectDetailsPage() {
  const { slug } = useParams();
  
  // Utilise le slug (en minuscule) pour trouver le projet, 
  // sinon retombe sur l'id pour garder la compatibilité avec les anciens liens
  // La comparaison ignore les accents : /projet/helenite ouvre aussi « HÉLÉNITE ».
  const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const project = PROJECTS.find(p =>
    p.title.toLowerCase() === slug?.toLowerCase() ||
    (slug !== undefined && stripAccents(p.title) === stripAccents(slug)) ||
    p.id === Number(slug)
  );

  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  useEffect(() => {
    if (project?.gallery) {
      setGalleryImages(project.gallery);
    }
  }, [project]);

  useEffect(() => {
    if (!project) return;
    window.scrollTo(0, 0);
  }, [project]);

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#031B17] text-white">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-[#F7C66A]">Projet introuvable</h1>
          <p className="mt-4 text-lg">Le projet que vous cherchez n'existe pas ou a été déplacé.</p>
        </div>
      </div>
    );
  }

  // Trouver les valeurs spécifiques dans les détails
  const typologieDetail = project.details?.find(d => d.label.toLowerCase().includes("typologie"));
  const surfaceDetail = project.details?.find(d => d.label.toLowerCase().includes("surface"));
  const blocsDetail = project.details?.find(d => d.label === "Blocs");
  const avancementDetail = project.details?.find(d => d.label.toLowerCase().includes("avancement"));

  // Transform project data to component format
  const projectData: ProjectData = {
    title: `RÉSIDENCE ${project.title}`,
    status: project.status === "EN COURS" ? "EN COURS DE RÉALISATION" : "PROJET TERMINÉ",
    description: project.fullDescription || project.description,
    stats: {
      address: project.location.split(',')[0].trim(), // Prend seulement la ville (ex: "Kouba")
      blocs: blocsDetail?.value || "01",
      progress: avancementDetail?.value || (project.status === "EN COURS" ? "01 %" : "100 %"),
      typologie: typologieDetail?.value,
      surface: surfaceDetail?.value,
    },
    heroImage: project.coverImage || project.image,
    amenities: (project.features || []).map(f => ({
      label: f,
      iconSrc: AMENITIES_ICONS[f] || undefined,
      fallbackIcon: !AMENITIES_ICONS[f] ? "fa-solid fa-check" : undefined
    })),
    gallery: galleryImages,
    plans: (project.plans || []).map(p => ({
        type: p.type, // Maintenant on utilise p.type car c'est la structure dans mockData
        area: p.area,
        image: p.image,
        rooms: p.rooms
    })),
    location: {
      mapUrl: project.mapLinkUrl || `https://www.google.com/maps/search/?api=1&query=${project.lat || 36.7},${project.lng || 3.0}`,
      description: project.location,
      mapEmbedUrl: project.mapEmbedUrl
    },
    virtualTourUrl: project.virtualTourUrl
  };

  // Composant pour les plans et la localisation (Ancienne disposition avec placeholders)
  const renderPlansAndLocation = (plans: Plan[], location: LocationData) => {
    // Si nous n'avons pas de plans, on ne rend rien ou juste la carte.
    // On utilise un état local pour le tab actif
    return <PlansAndLocationWrapper plans={plans} location={location} />;
  };

  return (
    <div className="relative min-h-screen bg-[#031B17] text-white font-['Montserrat']">
      <Seo
        title={`Résidence ${project.title} — Résidence haut standing à ${project.location.split(',')[0].trim()} | Aymen`}
        description={`Découvrez la résidence ${project.title} à ${project.location.split(',')[0].trim()} : appartements F2 à F5 haut standing, prestations premium, sécurité 24/7 et finitions soignées. Visitez avec Aymen…`}
        appendTitleSuffix={false}
        image={`https://aymenpromotion-dz.com/og-projet-${project.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-')}.jpg`}
        keywords={`résidence ${project.title}, ${project.title} aymen, appartement ${project.location.split(',')[0].trim()}, immobilier ${project.location.split(',')[0].trim()} alger, Résidence haut standing`}
      />
      {/* Background Texture & Lights */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[900px] h-[900px] bg-[radial-gradient(circle,rgba(21,105,83,0.3),transparent_70%)]" />
        <div className="absolute top-[40%] right-[-10%] w-[700px] h-[700px] bg-[radial-gradient(circle,rgba(225,187,127,0.1),transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay" style={{ 
          backgroundImage: 'url("/texture.webp")', 
          backgroundSize: '1200px', 
          backgroundRepeat: 'repeat' 
        }} />
      </div>
      
      <div className="relative z-10">
        <Header className="absolute top-0 left-0 z-40 w-full" />
        
        <FadeInSection>
          <DetailsHero data={projectData} />
        </FadeInSection>
        
        {projectData.amenities.length > 0 && (
          <FadeInSection delay={200}>
            <AmenitiesList amenities={projectData.amenities} />
          </FadeInSection>
        )}
        
        {projectData.gallery.length > 0 && (
          <FadeInSection delay={300}>
            <ProjectGallery images={projectData.gallery} projectName={projectData.title} />
          </FadeInSection>
        )}

        {projectData.virtualTourUrl && (
          <FadeInSection delay={350}>
            <section className="py-16 px-4 md:px-8">
              <div className="mx-auto max-w-7xl">
                <div className="mb-8 text-center">
                  <span className="font-['PhotographSignature'] text-4xl text-[#F7C66A] block mb-1">Découvrez</span>
                  <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-wide">Visite Virtuelle 360°</h2>
                </div>
                <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    src={projectData.virtualTourUrl}
                    className="absolute inset-0 h-full w-full"
                    frameBorder="0"
                    allowFullScreen
                    allow="autoplay; fullscreen; web-share; xr-spatial-tracking"
                    title={`Visite virtuelle ${projectData.title}`}
                    loading="lazy"
                  />
                </div>
              </div>
            </section>
          </FadeInSection>
        )}

        {projectData.plans.length > 0 && (
          <FadeInSection delay={400}>
            {renderPlansAndLocation(projectData.plans, projectData.location)}
          </FadeInSection>
        )}

        <FadeInSection delay={500}>
          <DetailsContact projectTitle={project.title} />
        </FadeInSection>
        
        <Footer />
      </div>
    </div>
  );
}

// --- Sub-components ---

function DetailsHero({ data }: { data: ProjectData }) {
  // Extract just the name if title is "RÉSIDENCE NAME"
  const projectName = data.title.replace("RÉSIDENCE ", "");

  return (
    <section className="w-full px-4 pt-40 pb-20 md:px-10 lg:px-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-20">
          
          {/* Left Content */}
          <div className="flex-1 space-y-8">
            <div className="space-y-4">
              <span className="text-2xl font-light text-white/90">Résidence</span>
              <h1 className="font-['PhotographSignature'] text-6xl md:text-8xl text-[#F7C66A] transform -rotate-2 origin-left leading-[1.2] lg:leading-[1.1] py-2">
                {projectName.charAt(0) + projectName.slice(1).toLowerCase()}
              </h1>
            </div>

            <p className="max-w-xl text-sm leading-relaxed text-white/80 md:text-base font-light">
              {data.description}
            </p>

            <div className="space-y-6">
              <p className="text-sm font-bold uppercase tracking-widest text-[#F7C66A]">
                {data.status}
              </p>

              <div className="flex flex-wrap gap-4">
                <StatBox label="Adresse" value={data.stats.address} />
                {data.stats.typologie && <StatBox label="Typologie" value={data.stats.typologie} />}
                {data.stats.surface && <StatBox label="Surface" value={data.stats.surface} />}
                <StatBox label="Blocs" value={data.stats.blocs} />
                {data.stats.progress === "Phase Terrassement" || data.stats.progress === "Avant-première" ? (
                  <div className="min-w-[140px] rounded-xl bg-[#1a3a2a] px-6 py-4 border border-[#F7C66A]/40 shadow-lg">
                    <div className="text-[10px] font-medium text-white/70 uppercase tracking-wide mb-1">État d'avancement</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#F7C66A] text-lg">{data.stats.progress === "Avant-première" ? "✨" : "🏗️"}</span>
                      <span className="text-sm font-bold text-[#F7C66A] uppercase tracking-wide">{data.stats.progress}</span>
                    </div>
                  </div>
                ) : (
                  <StatBox label="État d'avancement" value={data.stats.progress} />
                )}
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative h-[400px] w-full flex-1 overflow-hidden rounded-3xl md:h-[500px] shadow-2xl border border-white/10">
            <img
              src={data.heroImage}
              alt={`Résidence ${data.title} — Aymen Promotion Immobilière Alger`}
              className="h-full w-full object-cover"
            />
          </div>
          
        </div>
      </div>
    </section>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[140px] rounded-xl bg-[#2C4A44] px-6 py-4 border border-white/5 shadow-lg">
      <div className="text-[10px] font-medium text-white/70 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}

function AmenitiesList({ amenities }: { amenities: Amenity[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Pour le desktop (md et +), on affiche jusqu'à 6 items.
  // Pour le mobile, on n'en affiche que 3 à la fois pour éviter l'écrasement.
  const itemsPerViewDesktop = 6;
  const itemsPerViewMobile = 3;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % amenities.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + amenities.length) % amenities.length);
  };

  // On duplicate les items pour faire un carousel infini visuellement
  // On s'assure d'avoir assez d'items dupliqués pour remplir l'écran même si amenities est petit
  const carouselItems = amenities.length > 0 ? [...amenities, ...amenities, ...amenities, ...amenities] : [];

  // Si on a plus de 6 items, on active le carousel.
  const needsCarousel = amenities.length > 6;

  // Handle window resize for dynamic translation
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <section className="py-16 px-2 md:px-6 overflow-hidden">
      <div className="mx-auto max-w-7xl relative">
        {needsCarousel ? (
          <div className="relative group">
            {/* Flèche gauche */}
            <button 
              onClick={prevSlide}
              className="absolute left-0 md:-left-8 top-1/2 -translate-y-1/2 z-10 bg-[#031B17]/80 text-[#F7C66A] p-2 md:p-3 rounded-full hover:bg-[#F7C66A] hover:text-[#031B17] transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 shadow-lg"
            >
              <i className="fa-solid fa-chevron-left text-lg md:text-xl"></i>
            </button>

            {/* Carousel Container */}
            <div className="overflow-hidden px-8 md:px-12">
              <div 
                className="flex transition-transform duration-500 ease-in-out"
                style={{ 
                  // On mobile (width < 768px), it will show 3 items. On desktop it shows 6.
                  // We handle this responsiveness via Tailwind classes on the items.
                  transform: `translateX(-${currentIndex * (100 / (isMobile ? itemsPerViewMobile : itemsPerViewDesktop))}%)`,
                }}
              >
                {carouselItems.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="flex-none flex flex-col items-center gap-4 text-center px-2 md:px-4 w-[33.333%] md:w-[16.666%]" // 3 par vue sur mobile, 6 sur desktop
                  >
                    <div className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center transition-all duration-300 hover:scale-110">
                       {item.iconSrc ? (
                         <img 
                           src={item.iconSrc} 
                           alt={item.label}
                           className="h-full w-full object-contain"
                           onError={(e) => {
                             e.currentTarget.src = "/assets/comodites/fenetre.png";
                           }}
                         />
                       ) : (
                         <i className={`${item.fallbackIcon} text-3xl md:text-4xl text-white hover:text-[#F7C66A]`}></i>
                       )}
                    </div>
                    <span className="max-w-[100px] md:max-w-[120px] text-[10px] md:text-xs font-bold uppercase tracking-wider text-white hover:text-[#F7C66A] transition-colors leading-tight">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Flèche droite */}
            <button 
              onClick={nextSlide}
              className="absolute right-0 md:-right-8 top-1/2 -translate-y-1/2 z-10 bg-[#031B17]/80 text-[#F7C66A] p-2 md:p-3 rounded-full hover:bg-[#F7C66A] hover:text-[#031B17] transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 shadow-lg"
            >
              <i className="fa-solid fa-chevron-right text-lg md:text-xl"></i>
            </button>
          </div>
        ) : (
          /* Affichage normal si peu d'items */
          <div className="flex flex-wrap justify-center gap-6 md:gap-20">
            {amenities.map((item, idx) => (
              <div key={idx} className="flex flex-col items-center gap-4 text-center group">
                <div className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center transition-all duration-300 group-hover:scale-110">
                   {item.iconSrc ? (
                     <img 
                       src={item.iconSrc} 
                       alt={item.label}
                       className="h-full w-full object-contain"
                       onError={(e) => {
                         e.currentTarget.src = "/assets/comodites/fenetre.png";
                       }}
                     />
                   ) : (
                     <i className={`${item.fallbackIcon} text-3xl md:text-4xl text-white group-hover:text-[#F7C66A]`}></i>
                   )}
                </div>
                <span className="max-w-[100px] md:max-w-[120px] text-[10px] md:text-xs font-bold uppercase tracking-wider text-white group-hover:text-[#F7C66A] transition-colors leading-tight">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ProjectGallery({ images, projectName }: { images: string[]; projectName: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerView, setItemsPerView] = useState(1);

  // Duplicate images to create a longer strip for scrolling effect
  const displayImages = [...images, ...images];

  useEffect(() => {
    const handleResize = () => {
      // Tailwind md breakpoint is 768px
      if (window.innerWidth >= 768) {
        setItemsPerView(3);
      } else {
        setItemsPerView(1);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prev) => {
      const maxIndex = displayImages.length - itemsPerView;
      return prev >= maxIndex ? 0 : prev + 1;
    });
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => {
      const maxIndex = displayImages.length - itemsPerView;
      return prev <= 0 ? maxIndex : prev - 1;
    });
  };

  return (
    <section className="py-20 px-4 md:px-8">
       <div className="mx-auto max-w-7xl relative group">
         
         {/* Arrows */}
         <button 
            onClick={prevSlide}
            className="absolute left-0 top-1/2 z-20 -translate-y-1/2 -translate-x-2 md:-translate-x-12 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#031B17] shadow-xl transition hover:scale-110 active:scale-95"
            aria-label="Previous slide"
         >
           <i className="fa-solid fa-chevron-left"></i>
         </button>

         <button 
            onClick={nextSlide}
            className="absolute right-0 top-1/2 z-20 -translate-y-1/2 translate-x-2 md:translate-x-12 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#031B17] shadow-xl transition hover:scale-110 active:scale-95"
            aria-label="Next slide"
         >
           <i className="fa-solid fa-chevron-right"></i>
         </button>

         {/* Carousel Window */}
         <div className="overflow-hidden px-2 md:px-0">
           <div 
             className="flex transition-transform duration-500 ease-out"
             style={{ transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)` }}
           >
             {displayImages.map((img, idx) => (
               <div 
                 key={idx} 
                 className="flex-shrink-0 px-3"
                 style={{ width: `${100 / itemsPerView}%` }}
               >
                 <div className="overflow-hidden rounded-xl border border-white/10 shadow-lg group relative aspect-square">
                    <img
                      src={img}
                      alt={`Photo ${idx + 1} — ${projectName}, Aymen Promotion`}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                 </div>
               </div>
             ))}
           </div>
         </div>
       </div>
    </section>
  );
}

// We can remove PlansAndLocation completely since it was just the map, 
// and we already put the map directly in the main component.

function PlansAndLocationWrapper({ plans, location }: { plans: Plan[]; location: LocationData }) {
  const [openPlan, setOpenPlan] = useState<number | null>(null);
  if (!plans || plans.length === 0) return null;

  // Helper function to extract a numeric value for sorting.
  // It takes the first number it finds in the area string.
  const extractAreaNumber = (areaStr: string) => {
    if (!areaStr) return 0;
    const match = areaStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : 0;
  };

  // Sort plans by area (ascending). Si une typologie n'a pas de surface chiffrée
  // (« Consultable »), on garde l'ordre fourni plutôt que de la remonter en tête.
  const allHaveArea = plans.every((p) => extractAreaNumber(p.area) > 0);
  const sortedPlans = allHaveArea
    ? [...plans].sort((a, b) => extractAreaNumber(a.area) - extractAreaNumber(b.area))
    : plans;

  return (
    <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-2">
      {/* Left: Typologies */}
      <div className="flex flex-col rounded-3xl bg-[#052620] p-8 shadow-2xl border border-white/5">
        <h2 className="mb-8 text-2xl font-bold uppercase tracking-wide text-center">TYPOLOGIES</h2>
        
        <div className="flex flex-col gap-6 justify-center items-center flex-1">
          {sortedPlans.map((p, idx) => {
            const label = (
              <span className="text-xl md:text-2xl font-medium text-white">
                <span className="font-bold text-[#F7C66A] mr-3">{p.type}</span>
                {p.area && !String(p.area).toLowerCase().includes("consultable") ? p.area : ""}
              </span>
            );
            const boxClass =
              "w-full max-w-sm rounded-xl border border-[#F7C66A]/50 px-8 py-5 text-center transition-all hover:border-[#F7C66A] hover:bg-[#F7C66A]/5 flex items-center justify-center min-h-[70px]";

            // Typologie avec détail des pièces : carte dépliable.
            if (p.rooms && p.rooms.length > 0) {
              const isOpen = openPlan === idx;
              return (
                <div key={idx} className="w-full max-w-sm">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenPlan(isOpen ? null : idx)}
                    className={`${boxClass} gap-3 ${isOpen ? "border-[#F7C66A] bg-[#F7C66A]/5" : ""}`}
                  >
                    {label}
                    <i className={`fa-solid fa-chevron-down text-xs text-[#F7C66A] transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
                  </button>
                  {isOpen && (
                    <table className="mt-2 w-full overflow-hidden rounded-xl text-sm">
                      <caption className="sr-only">Détail des surfaces du {p.type} type</caption>
                      <thead>
                        <tr className="bg-[#F7C66A]/15 text-left text-[11px] uppercase tracking-wider text-[#F7C66A]">
                          <th scope="col" className="px-4 py-2 font-bold">Espace</th>
                          <th scope="col" className="px-4 py-2 text-right font-bold">Surface</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.rooms.map((r) => (
                          <tr key={r.name} className="border-b border-white/10 last:border-0">
                            <td className="px-4 py-2 text-white/80">{r.name}</td>
                            <td className="whitespace-nowrap px-4 py-2 text-right text-white">{r.area}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            }

            return (
              <div key={idx} className={boxClass}>
                {label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Localisation */}
      <div className="flex flex-col rounded-3xl bg-[#052620] p-8 shadow-2xl border border-[#0A84FF]">
        <h2 className="mb-8 text-2xl font-bold uppercase tracking-wide text-center">LOCALISATION</h2>
        
        <div className="group relative flex-1 aspect-square w-full overflow-hidden rounded-2xl bg-[#031B17]">
          {location.mapEmbedUrl ? (
            <div className="relative h-full w-full group/map">
              <iframe
                src={location.mapEmbedUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={false}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Carte de ${location.description}`}
                className="h-full w-full object-cover"
              ></iframe>
              <a 
                href={location.mapUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/map:opacity-100 transition-opacity duration-300"
              >
                <div className="flex items-center gap-3 rounded-full bg-[#F7C66A] px-6 py-3 text-[#031B17] shadow-lg transition-transform duration-300 hover:scale-105">
                  <i className="fa-solid fa-location-dot text-lg"></i>
                  <span className="font-bold uppercase tracking-wide text-sm">Voir sur la carte</span>
                </div>
              </a>
            </div>
          ) : (
            <a 
              href={location.mapUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block h-full w-full"
            >
               {/* Map Image Placeholder */}
               <img 
                 src="/sections/map-placeholder.png" 
                 onError={(e) => {
                   e.currentTarget.src = "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1000"; 
                 }}
                 alt="Carte de localisation résidence Aymen Promotion Alger"
                 className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-40" 
               />
               
               {/* Overlay Button */}
               <div className="absolute inset-0 flex items-center justify-center">
                 <div className="flex items-center gap-3 rounded-full bg-[#F7C66A] px-6 py-3 text-[#031B17] shadow-lg transition-transform duration-300 group-hover:scale-105">
                   <i className="fa-solid fa-location-dot text-lg"></i>
                   <span className="font-bold uppercase tracking-wide text-sm">Voir sur la carte</span>
                 </div>
               </div>
            </a>
          )}
        </div>
        
        {location.description && (
          <p className="text-white/70 text-sm leading-relaxed text-center mt-6">
            {location.description}
          </p>
        )}
      </div>
    </section>
  );
}

// --- Countries and Wilayas Data ---
const ALGERIAN_WILAYAS = [
  "01 - Adrar", "02 - Chlef", "03 - Laghouat", "04 - Oum El Bouaghi", "05 - Batna", 
  "06 - Béjaïa", "07 - Biskra", "08 - Béchar", "09 - Blida", "10 - Bouira", 
  "11 - Tamanrasset", "12 - Tébessa", "13 - Tlemcen", "14 - Tiaret", "15 - Tizi Ouzou", 
  "16 - Alger", "17 - Djelfa", "18 - Jijel", "19 - Sétif", "20 - Saïda", 
  "21 - Skikda", "22 - Sidi Bel Abbès", "23 - Annaba", "24 - Guelma", "25 - Constantine", 
  "26 - Médéa", "27 - Mostaganem", "28 - M'Sila", "29 - Mascara", "30 - Ouargla", 
  "31 - Oran", "32 - El Bayadh", "33 - Illizi", "34 - Bordj Bou Arréridj", "35 - Boumerdès", 
  "36 - El Tarf", "37 - Tindouf", "38 - Tissemsilt", "39 - El Oued", "40 - Khenchela", 
  "41 - Souk Ahras", "42 - Tipaza", "43 - Mila", "44 - Aïn Defla", "45 - Naâma", 
  "46 - Aïn Témouchent", "47 - Ghardaïa", "48 - Relizane", "49 - El M'Ghair", "50 - El Meniaa", 
  "51 - Ouled Djellal", "52 - Bordj Baji Mokhtar", "53 - Béni Abbès", "54 - Timimoun", 
  "55 - Touggourt", "56 - Djanet", "57 - In Salah", "58 - In Guezzam"
];

const COUNTRIES = [
  "Algérie", "France", "Canada", "Belgique", "Suisse", "Tunisie", "Maroc", "Espagne", 
  "Italie", "Allemagne", "États-Unis", "Royaume-Uni", "Turquie", "Émirats Arabes Unis", "Qatar", "Autre"
];

function DetailsContact({ projectTitle }: { projectTitle?: string }) {
  const [formData, setFormData] = useState({
    email: "",
    lastName: "",
    firstName: "",
    phone: "",
    country: "Algérie",
    wilaya: "",
    budget: "",
    profession: "",
    financing: "",
    interest: "",
    locations: [] as string[],
    contactDays: [] as string[],
    contactTime: "",
    projectStatus: "",
    consent: false,
    sourceProject: projectTitle || "RÉSIDENCE AZURITE"
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        if (name === 'consent') {
            setFormData(prev => ({ ...prev, consent: checked }));
        }
    } else {
        setFormData(prev => {
          const newData = { ...prev, [name]: value };
          // Clear wilaya if country is not Algeria
          if (name === 'country' && value !== "Algérie") {
            newData.wilaya = "";
          }
          return newData;
        });
    }
  };

  const handleArrayCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>, arrayName: 'locations' | 'contactDays') => {
    const { value, checked } = e.target;
    setFormData(prev => {
      const currentArray = prev[arrayName];
      if (checked) {
        return { ...prev, [arrayName]: [...currentArray, value] };
      } else {
        return { ...prev, [arrayName]: currentArray.filter(item => item !== value) };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: null, message: "" });

    // Code réel pour le backend
    try {
      const response = await fetch(`${API_BASE_URL}/api/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, ...getHubspotContext(), ...getTrackerPayload() }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ type: 'success', message: "Votre demande de devis a été envoyée avec succès !" });
        setFormData({
            email: "",
            lastName: "",
            firstName: "",
            phone: "",
            country: "",
            wilaya: "",
            budget: "",
            profession: "",
            financing: "",
            interest: "",
            locations: [],
            contactDays: [],
            contactTime: "",
            projectStatus: "",
            consent: false,
            sourceProject: projectTitle || "RÉSIDENCE AZURITE"
        });
      } else {
        setStatus({ type: 'error', message: data.message || "Une erreur est survenue." });
      }
    } catch (error) {
      setStatus({ type: 'error', message: "Impossible de contacter le serveur." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <h2 className="mb-12 text-3xl font-bold uppercase tracking-wide text-white">Devis</h2>
      
      {status.type === 'success' ? (
        <div className="bg-green-500/20 border border-green-500 rounded-lg p-12 text-center max-w-3xl mx-auto">
          <div className="w-24 h-24 mx-auto mb-8 bg-green-500/30 rounded-full flex items-center justify-center">
            <i className="fa-solid fa-check text-5xl text-green-300"></i>
          </div>
          <h3 className="text-3xl font-medium text-green-300 mb-4">Demande envoyée !</h3>
          <p className="text-green-200 mb-8 text-lg">
            {status.message || "Votre demande de devis a été envoyée avec succès. Un conseiller vous contactera dans les plus brefs délais."}
          </p>
          <button 
            onClick={() => setStatus({ type: null, message: "" })}
            className="bg-green-600 text-white px-10 py-4 rounded-lg hover:bg-green-700 transition-colors font-medium shadow-md text-lg"
          >
            Nouvelle demande
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-2">
          {/* Left Column - Personal & Project Info */}
          <div className="space-y-6">
            <InputGroup label="Email*" name="email" type="email" value={formData.email} onChange={handleChange} required />
            <div className="grid grid-cols-2 gap-4">
              <InputGroup label="Nom*" name="lastName" type="text" value={formData.lastName} onChange={handleChange} required />
              <InputGroup label="Prénom*" name="firstName" type="text" value={formData.firstName} onChange={handleChange} required />
            </div>
            
            {/* Phone */}
            <div className="border-b border-white/20 pt-4">
              <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 border-r border-white/20 pr-3">
                    <img src="https://flagcdn.com/w20/dz.png" alt="DZ" className="h-4 w-6 object-cover" />
                    <span className="text-white">+213</span>
                  </div>
                  <input 
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full bg-transparent py-2 text-white placeholder-white/50 focus:outline-none focus:placeholder-[#F7C66A] transition-colors" 
                    placeholder="Téléphone"
                  />
              </div>
            </div>

            <SelectGroup label="Pays" name="country" value={formData.country} onChange={handleChange} options={COUNTRIES} />
            {formData.country === "Algérie" && (
              <SelectGroup label="Wilaya *" name="wilaya" value={formData.wilaya} onChange={handleChange} options={ALGERIAN_WILAYAS} required />
            )}
            <SelectGroup label="Budget estimé *" name="budget" value={formData.budget} onChange={handleChange} options={["< 20M DA", "20M DA - 40M DA", "> 40M DA"]} required />
            <SelectGroup label="Secteur d'activité *" name="profession" value={formData.profession} onChange={handleChange} options={["Salarié", "Profession Libérale", "Commerçant", "Autre"]} required />
            <SelectGroup label="Type de financement *" name="financing" value={formData.financing} onChange={handleChange} options={["Fonds Propres", "Crédit Bancaire", "Mixte"]} required />
            <SelectGroup label="Intéressé par *" name="interest" value={formData.interest} onChange={handleChange} options={["Appartement", "Duplex", "Local Commercial", "Bureau"]} required />
          </div>

          {/* Right Column - Preferences */}
          <div className="space-y-8">
            {/* Localisation */}
            <div>
              <label className="mb-4 block text-sm font-bold uppercase text-[#F7C66A]">Localisation souhaitée</label>
              <div className="grid grid-cols-2 gap-y-3 sm:grid-cols-3">
                  {["Hydra", "Dely Ibrahim", "Draria", "Ruisseau", "Birkhadem", "Bad Ezzouar", "El Achour", "Kouba", "Dar el Beida", "Chéraga", "Said Hamdine"].map(loc => (
                    <label key={loc} className="flex items-center gap-3 text-white/80 cursor-pointer hover:text-white">
                      <input 
                          type="checkbox" 
                          value={loc}
                          checked={formData.locations.includes(loc)}
                          onChange={(e) => handleArrayCheckboxChange(e, 'locations')}
                          className="h-4 w-4 rounded border-white/30 bg-transparent text-[#F7C66A] focus:ring-[#F7C66A]" 
                      />
                      <span className="text-sm">{loc}</span>
                    </label>
                  ))}
              </div>
            </div>

            {/* Jours de contact */}
            <div>
              <label className="mb-4 block text-sm font-bold uppercase text-[#F7C66A]">Jours de contact préférés *</label>
              <div className="grid grid-cols-2 gap-y-3 sm:grid-cols-3">
                  {["Samedi", "Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi"].map(day => (
                    <label key={day} className="flex items-center gap-3 text-white/80 cursor-pointer hover:text-white">
                      <input 
                          type="checkbox" 
                          value={day}
                          checked={formData.contactDays.includes(day)}
                          onChange={(e) => handleArrayCheckboxChange(e, 'contactDays')}
                          className="h-4 w-4 rounded border-white/30 bg-transparent text-[#F7C66A] focus:ring-[#F7C66A]" 
                      />
                      <span className="text-sm">{day}</span>
                    </label>
                  ))}
              </div>
            </div>

            <SelectGroup label="Heure de contact préférée" name="contactTime" value={formData.contactTime} onChange={handleChange} options={["Matin (9h-12h)", "Après-midi (13h-17h)", "Soir (17h-20h)"]} />
            <SelectGroup label="Statut du projet *" name="projectStatus" value={formData.projectStatus} onChange={handleChange} options={["Urgent", "Moyen terme", "Long terme"]} required />
          </div>

          {/* Bottom Full Width */}
          <div className="lg:col-span-2 pt-8 border-t border-white/10">
            <label className="flex items-start gap-3 text-sm text-white/60 cursor-pointer mb-8">
              <input 
                  type="checkbox" 
                  name="consent"
                  checked={formData.consent}
                  onChange={handleChange}
                  required
                  className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent text-[#F7C66A]" 
              />
              <span className="leading-relaxed">CONSENTEMENT : J'accepte que mes données soient utilisées pour le traitement de ma demande en conformité avec la loi 18-07 révisée et compléter par la loi 11-25.</span>
            </label>
            
            {status.type === 'error' && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 text-red-200 mb-6">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  <span>{status.message}</span>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full rounded-none border border-[#F7C66A] bg-[#F7C66A] py-4 text-sm font-bold uppercase tracking-widest text-[#031B17] transition hover:bg-transparent hover:text-[#F7C66A] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#031B17] border-t-transparent"></div>
                  ENVOI EN COURS...
                </>
              ) : (
                'ENVOYER'
              )}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function InputGroup({ label, name, type, placeholder, value, onChange, required }: { label: string; name: string; type: string; placeholder?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; required?: boolean }) {
  const displayPlaceholder = placeholder || label;
  return (
    <div className="border-b border-white/20 pt-4">
      <input 
        type={type} 
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={displayPlaceholder}
        className="w-full bg-transparent py-2 text-white placeholder-white/50 focus:outline-none focus:placeholder-[#F7C66A] transition-colors" 
      />
    </div>
  );
}

function SelectGroup({ label, name, options, value, onChange, required }: { label: string; name: string; options: string[]; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; required?: boolean }) {
  return (
    <div className="relative border-b border-white/20 pt-4">
       <select 
         name={name}
         value={value}
         onChange={onChange}
         required={required}
         className="w-full appearance-none bg-transparent py-2 text-white/70 focus:text-white focus:outline-none [&>option]:bg-[#031B17]"
       >
          <option value="" disabled>{label}</option>
          {options.map(o => <option key={o} value={o} className="text-white">{o}</option>)}
       </select>
       <div className="pointer-events-none absolute right-0 top-1/2 mt-2 -translate-y-1/2 text-white/50">
         <i className="fa-solid fa-chevron-down text-xs"></i>
       </div>
    </div>
  );
}

function useOnScreen(ref: React.RefObject<HTMLElement>, rootMargin = "0px") {
  const [isIntersecting, setIntersecting] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIntersecting(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, rootMargin]);
  return isIntersecting;
}

function FadeInSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isVisible = useOnScreen(ref as React.RefObject<HTMLElement>);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out transform ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
