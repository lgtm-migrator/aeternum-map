import type { LatLngExpression } from 'leaflet';

export type Map = {
  name: string;
  title: string;
  folder: string;
  maxZoom: number;
  minZoom: number;
  maxBounds: LatLngExpression[];
};

export const mapDetails: Map[] = [
  {
    name: 'NewWorld_VitaeEterna',
    title: 'Aeternum Map',
    folder: 'newworld_vitaeeterna',
    maxZoom: 6,
    minZoom: 0,
    maxBounds: [
      [-10000, -7000],
      [20000, 25000],
    ],
  },
  {
    name: 'NW_Dungeon_Windsward_00',
    title: 'Amrine Excavation',
    folder: 'nw_dungeon_windsward_00',
    maxZoom: 6,
    minZoom: 3,
    maxBounds: [
      [500, 600],
      [1000, 1050],
    ],
  },
  {
    name: 'NW_Dungeon_BrimstoneSands_00',
    title: 'The Ennead',
    folder: 'nw_dungeon_brimstonesands_00',
    maxZoom: 6,
    minZoom: 3,
    maxBounds: [
      [740, 550],
      [1450, 1500],
    ],
  },
  {
    name: 'NW_Dungeon_CutlassKeys_00',
    title: 'Barnacles & Black Powder',
    folder: 'nw_dungeon_cutlasskeys_00',
    maxZoom: 6,
    minZoom: 3,
    maxBounds: [
      [700, 182],
      [1600, 870],
    ],
  },
  {
    name: 'NW_Dungeon_Edengrove_00',
    title: 'Garden of Genesis',
    folder: 'nw_dungeon_edengrove_00',
    maxZoom: 6,
    minZoom: 3,
    maxBounds: [
      [950, 300],
      [1600, 1000],
    ],
  },
  {
    name: 'NW_Dungeon_Reekwater_00',
    title: 'Lazarus Instrumentality',
    folder: 'nw_dungeon_reekwater_00',
    maxZoom: 6,
    minZoom: 3,
    maxBounds: [
      [530, 600],
      [1000, 1000],
    ],
  },
  {
    name: 'NW_Dungeon_Everfall_00',
    title: 'Starstone Barrows',
    folder: 'nw_dungeon_everfall_00',
    maxZoom: 6,
    minZoom: 3,
    maxBounds: [
      [350, 280],
      [740, 1000],
    ],
  },
  {
    name: 'NW_Dungeon_RestlessShores_01',
    title: 'The Depths',
    folder: 'nw_dungeon_restlessshores_01',
    maxZoom: 6,
    minZoom: 3,
    maxBounds: [
      [750, 650],
      [1400, 1250],
    ],
  },
  {
    name: 'NW_Dungeon_ShatterMtn_00',
    title: "Tempest's Heart",
    folder: 'nw_dungeon_shattermtn_00',
    maxZoom: 6,
    minZoom: 3,
    maxBounds: [
      [300, 220],
      [1970, 2150],
    ],
  },
  {
    name: 'NW_Arena01',
    title: '3v3 PvP Arena',
    folder: 'nw_arena01',
    maxZoom: 6,
    minZoom: 3,
    maxBounds: [
      [800, 800],
      [1000, 1000],
    ],
  },
];

export const AETERNUM_MAP = mapDetails[0];

export const findMapDetails = (map: string) => {
  const lowerCasedMap = map.toLowerCase();
  return mapDetails.find(
    (mapDetail) =>
      mapDetail.name.toLowerCase() === lowerCasedMap ||
      mapDetail.title.toLowerCase() === lowerCasedMap
  );
};

export const mapIsAeternumMap = (map: string) => {
  const mapDetails = findMapDetails(map);
  return mapDetails ? mapDetails.name === AETERNUM_MAP.name : false;
};
