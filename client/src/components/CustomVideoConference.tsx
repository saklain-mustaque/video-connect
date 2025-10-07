// components/CustomVideoConference.tsx

import type {
  TrackReferenceOrPlaceholder,
  WidgetState,
} from '@livekit/components-core';
import { isEqualTrackRef, isTrackReference, isWeb, log } from '@livekit/components-core';
import { RoomEvent, Track } from 'livekit-client';
import * as React from 'react';
import {
  CarouselLayout,
  ConnectionStateToast,
  FocusLayout,
  FocusLayoutContainer,
  GridLayout,
  LayoutContextProvider,
  ParticipantTile,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { useCreateLayoutContext } from '@livekit/components-react';
import { usePinnedTracks, useTracks } from '@livekit/components-react';
import { ControlBar } from '@livekit/components-react';

import EnhancedChatPanel from './EnhancedChatPanel';

export interface CustomVideoConferenceProps extends React.HTMLAttributes<HTMLDivElement> {
  roomId: string;
  userId: string;
  userName: string;
  /** @alpha */
  SettingsComponent?: React.ComponentType;
}

export function CustomVideoConference({
  roomId,
  userId,
  userName,
  SettingsComponent,
  ...props
}: CustomVideoConferenceProps) {
  const [widgetState, setWidgetState] = React.useState<WidgetState>({
    showChat: false,
    unreadMessages: 0,
    showSettings: false,
  });
  const lastAutoFocusedScreenShareTrack = React.useRef<TrackReferenceOrPlaceholder | null>(null);

  const [totalMessageCount, setTotalMessageCount] = React.useState(0);
  const messageCountOnClose = React.useRef(0);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { updateOnlyOn: [RoomEvent.ActiveSpeakersChanged], onlySubscribed: false },
  );

  const widgetUpdate = React.useCallback((state: WidgetState) => {
    log.debug('updating widget state', state);
    setWidgetState(prevState => ({ ...prevState, ...state }));
  }, []);

  const layoutContext = useCreateLayoutContext();

  const screenShareTracks = tracks
    .filter(isTrackReference)
    .filter((track) => track.publication.source === Track.Source.ScreenShare);

  const focusTrack = usePinnedTracks(layoutContext)?.[0];
  const carouselTracks = tracks.filter((track) => !isEqualTrackRef(track, focusTrack));

  // Effects for unread messages and screen sharing remain the same...
  React.useEffect(() => {
    if (!widgetState.showChat) {
      messageCountOnClose.current = totalMessageCount;
    }
    if (widgetState.showChat) {
      setWidgetState(prev => ({ ...prev, unreadMessages: 0 }));
    }
  }, [widgetState.showChat, totalMessageCount]);

  React.useEffect(() => {
    if (!widgetState.showChat) {
      const newUnreadMessages = totalMessageCount - messageCountOnClose.current;
      if (newUnreadMessages > 0) {
        setWidgetState(prev => ({ ...prev, unreadMessages: newUnreadMessages }));
      }
    }
  }, [totalMessageCount, widgetState.showChat]);

  React.useEffect(() => {
    if (
      screenShareTracks.some((track) => track.publication.isSubscribed) &&
      lastAutoFocusedScreenShareTrack.current === null
    ) {
      log.debug('Auto set screen share focus:', { newScreenShareTrack: screenShareTracks[0] });
      layoutContext.pin.dispatch?.({ msg: 'set_pin', trackReference: screenShareTracks[0] });
      lastAutoFocusedScreenShareTrack.current = screenShareTracks[0];
    } else if (
      lastAutoFocusedScreenShareTrack.current &&
      !screenShareTracks.some(
        (track) =>
          track.publication.trackSid ===
          lastAutoFocusedScreenShareTrack.current?.publication?.trackSid,
      )
    ) {
      log.debug('Auto clearing screen share focus.');
      layoutContext.pin.dispatch?.({ msg: 'clear_pin' });
      lastAutoFocusedScreenShareTrack.current = null;
    }
    if (focusTrack && !isTrackReference(focusTrack)) {
      const updatedFocusTrack = tracks.find(
        (tr) =>
          tr.participant.identity === focusTrack.participant.identity &&
          tr.source === focusTrack.source,
      );
      if (updatedFocusTrack !== focusTrack && isTrackReference(updatedFocusTrack)) {
        layoutContext.pin.dispatch?.({ msg: 'set_pin', trackReference: updatedFocusTrack });
      }
    }
  }, [
    screenShareTracks
      .map((ref) => `${ref.publication.trackSid}_${ref.publication.isSubscribed}`)
      .join(),
    focusTrack?.publication?.trackSid,
    tracks,
  ]);

  return (
    <div className="lk-video-conference" {...props}>
      {isWeb() && (
        <LayoutContextProvider
          value={layoutContext}
          onWidgetChange={widgetUpdate}
        >
          <div className="lk-video-conference-inner">
            {!focusTrack ? (
              <div className="lk-grid-layout-wrapper">
                <GridLayout tracks={tracks}>
                  <ParticipantTile />
                </GridLayout>
              </div>
            ) : (
              <div className="lk-focus-layout-wrapper">
                <FocusLayoutContainer>
                  <CarouselLayout tracks={carouselTracks}>
                    <ParticipantTile />
                  </CarouselLayout>
                  {focusTrack && <FocusLayout trackRef={focusTrack} />}
                </FocusLayoutContainer>
              </div>
            )}
            <ControlBar controls={{ chat: true, settings: !!SettingsComponent }} />
          </div>

          {widgetState.showChat && (
            <EnhancedChatPanel
              roomId={roomId}
              userId={userId}
              userName={userName}
              isOpen={widgetState.showChat}
              // KEY FIX: Dispatch the same 'toggle_chat' action the ControlBar uses
              onClose={() => {
                layoutContext.widget.dispatch?.({ msg: 'toggle_chat' });
              }}
              onNewMessage={setTotalMessageCount}
            />
          )}
        </LayoutContextProvider>
      )}
      <RoomAudioRenderer />
      <ConnectionStateToast />
    </div>
  );
}