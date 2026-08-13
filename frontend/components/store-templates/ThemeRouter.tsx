import type { StoreTemplateProps } from "@/app/store/[slug]/layout";
import type { StoreThemeMeta, StoreColors } from "@/components/store-templates/configs";
import ProfessionalBlueTemplate from "@/components/store-templates/themes/professional-blue/ProfessionalBlueTemplate";
import WarmModernTemplate from "@/components/store-templates/themes/warm-modern/WarmModernTemplate";
import NaturalGreenTemplate from "@/components/store-templates/themes/natural-green/NaturalGreenTemplate";
import PinkElegantTemplate from "@/components/store-templates/themes/pink-elegant/PinkElegantTemplate";
import RoyalPurpleTemplate from "@/components/store-templates/themes/royal-purple/RoyalPurpleTemplate";
import BlackMinimalTemplate from "@/components/store-templates/themes/black-minimal/BlackMinimalTemplate";
import B2bFormalTemplate from "@/components/store-templates/themes/b2b-formal/B2bFormalTemplate";
import B2bCalmTemplate from "@/components/store-templates/themes/b2b-calm/B2bCalmTemplate";
import RestaurantTemplate from "@/components/store-templates/themes/restaurant/RestaurantTemplate";
import PharmacyTemplate from "@/components/store-templates/themes/pharmacy/PharmacyTemplate";

interface ThemeRouterProps extends StoreTemplateProps {
  themeMeta: StoreThemeMeta;
  colors: StoreColors;
}

const THEMES: Record<string, React.ComponentType<ThemeRouterProps>> = {
  "professional-blue": ProfessionalBlueTemplate,
  "warm-modern": WarmModernTemplate,
  "natural-green": NaturalGreenTemplate,
  "pink-elegant": PinkElegantTemplate,
  "royal-purple": RoyalPurpleTemplate,
  "black-minimal": BlackMinimalTemplate,
  "b2b-formal": B2bFormalTemplate,
  "b2b-calm": B2bCalmTemplate,
  restaurant: RestaurantTemplate,
  pharmacy: PharmacyTemplate,
};

export default function ThemeRouter(props: ThemeRouterProps) {
  const Template = THEMES[props.themeMeta.id] || ProfessionalBlueTemplate;
  return <Template {...props}>{props.children}</Template>;
}