import { useEffect, useState } from 'react';
import type { Group } from '../../utils/useReadLivePosition';
import { latestLeafletMap } from './useWorldMap';
import { useSettings } from '../../contexts/SettingsContext';
import PositionMarker from './PositionMarker';
import { createPlayerIcon } from './playerIcon';
import ColorHash from 'color-hash';
import { useMap } from 'ui/utils/routes';
import { findMapDetails } from 'static';

const colorHash = new ColorHash();

function useGroupPositions(group: Group): void {
  const [playerMarkers, setPlayerMarkers] = useState<{
    [username: string]: PositionMarker;
  }>({});

  const { showPlayerNames } = useSettings();
  const map = useMap();

  useEffect(() => {
    const groupValues = Object.values(group);
    Object.values(playerMarkers).forEach((marker, index) => {
      marker.unbindTooltip();
      marker.bindTooltip(groupValues[index].username!, {
        direction: 'top',
        permanent: showPlayerNames,
      });
    });
  }, [showPlayerNames]);

  useEffect(() => {
    if (!latestLeafletMap) {
      return;
    }
    const removeablePlayerMarkers = { ...playerMarkers };

    const mapDetails = findMapDetails(map);
    const newPlayerMarkers = Object.values(group)
      .filter((player) => {
        const playerMapDetails = player.map
          ? findMapDetails(player.map)
          : undefined;
        return (
          player.position && player.username && mapDetails === playerMapDetails
        );
      })
      .reduce(
        (acc, player) => {
          const username = player.username!;
          const position = player.position!;
          delete removeablePlayerMarkers[username];
          const existingMarker = playerMarkers[username];
          let marker: PositionMarker = playerMarkers[username];

          if (!existingMarker) {
            marker = new PositionMarker(player.position!.location, {
              icon: createPlayerIcon(colorHash.hex(username)),
              zIndexOffset: 8999,
              pmIgnore: true,
            });

            marker.bindTooltip(username, {
              direction: 'top',
              permanent: showPlayerNames,
            });
            marker.addTo(latestLeafletMap!);
          }

          const playerImage = marker.getElement()!;
          let rotation = position.rotation - 180;
          const oldRotation =
            +(playerImage.getAttribute('data-rotation') || '0') || rotation;
          let spins = 0;
          if (oldRotation >= 180) {
            spins += Math.floor(Math.abs(oldRotation + 180) / 360);
          } else if (oldRotation <= -180) {
            spins -= Math.floor(Math.abs(oldRotation - 180) / 360);
          }
          rotation += 360 * spins;
          if (oldRotation - rotation >= 180) {
            rotation += 360;
          } else if (rotation - oldRotation >= 180) {
            rotation -= 360;
          }
          playerImage.setAttribute('data-rotation', rotation.toString());
          const newRotation = -rotation - 90;
          marker.rotation = newRotation;
          marker.setLatLng(position.location);

          return {
            ...acc,
            [username]: marker,
          };
        },
        {} as {
          [username: string]: PositionMarker;
        }
      );
    Object.values(removeablePlayerMarkers).forEach((marker) => marker.remove());
    setPlayerMarkers(newPlayerMarkers);
  }, [latestLeafletMap, group, map]);
}

export default useGroupPositions;
