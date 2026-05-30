import type { ComponentType } from "react";
import { BedGenerator } from "@/components/generators/BedGenerator";
import { CarpetGenerator } from "@/components/generators/CarpetGenerator";
import { ChairGenerator } from "@/components/generators/ChairGenerator";
import { GenericObjectGenerator } from "@/components/generators/GenericObjectGenerator";
import { SofaGenerator } from "@/components/generators/SofaGenerator";
import { TableGenerator } from "@/components/generators/TableGenerator";
import { TVUnitGenerator } from "@/components/generators/TVUnitGenerator";
import { WardrobeGenerator } from "@/components/generators/WardrobeGenerator";
import type { RoomObject } from "@/types/room";
import type { GeneratorName } from "@/types/room";

type GeneratorProps = {
  object: RoomObject;
  selected: boolean;
};

export const generatorMap: Record<GeneratorName, ComponentType<GeneratorProps>> = {
  SofaGenerator,
  BedGenerator,
  TableGenerator,
  ChairGenerator,
  WardrobeGenerator,
  TVUnitGenerator,
  CarpetGenerator,
  GenericObjectGenerator,
};
