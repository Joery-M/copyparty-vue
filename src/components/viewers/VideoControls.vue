<script setup lang="ts">
import { formatTimeNoMs } from '@/lib/format';
import { useShortcut } from '@/lib/keyboard';
import { computedWithExternalSetter } from '@/lib/utils';
import { Button } from '@shadcn/button';
import { Slider } from '@shadcn/slider';
import { useEventListener, watchThrottled } from '@vueuse/core';
import { Pause, Play, Volume, Volume1, Volume2, VolumeOff } from 'lucide-vue-next';
import { onBeforeUnmount, onMounted, ref, shallowRef, watchEffect, type HTMLAttributes } from 'vue';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@shadcn/hover-card';
import { useSettings } from '@/stores/useSettings';
import type { File } from '@/lib/interop';
import { API, getApiUrl } from '@/lib/api';
import { useQueryCache, type _JSONPrimitive } from '@pinia/colada';

const props = defineProps<{
    video: HTMLVideoElement;
    class?: HTMLAttributes['class'];
    file: File;
}>();

const queryCache = useQueryCache();
const settings = useSettings();

const duration = ref(0);
const time = computedWithExternalSetter(0, (v) => (props.video.currentTime = v));
const isPlaying = computedWithExternalSetter(false, (v) =>
    v ? props.video.play() : props.video.pause()
);
const muted = computedWithExternalSetter(false, (v) => (props.video.muted = v));
const volume = computedWithExternalSetter(
    settings.preview.video.volume,
    (v) => (props.video.volume = settings.preview.video.volume = Math.max(0, Math.min(v, 1)))
);

// For HMR mostly
onMounted(() => {
    time.setInternal(props.video.currentTime);
    isPlaying.setInternal(!props.video.paused);
    duration.value = props.video.duration;
    volume.value = settings.preview.video.volume;
    muted.value = settings.preview.video.muted;
    updateBuffered();
});

useEventListener(props.video, ['timeupdate', 'seeked', 'seeking'], () =>
    time.setInternal(props.video.currentTime)
);
useEventListener(props.video, ['play', 'playing'], () => isPlaying.setInternal(true));
useEventListener(props.video, 'pause', () => isPlaying.setInternal(false));
useEventListener(props.video, 'click', () => (isPlaying.value = !isPlaying.value));

useEventListener(props.video, ['loadedmetadata', 'loadeddata'], () => {
    duration.value = props.video.duration;
});

const buffered = ref(0);

const updateBuffered = () => {
    const ranges = props.video.buffered;
    let max = 0;
    for (var i = 0; i < ranges.length; i++) {
        const end = ranges.end(i);
        if (end > max) max = end;
    }
    if (max !== buffered.value) buffered.value = max;
};
useEventListener(props.video, ['progress', 'timeupdate'], updateBuffered);
useEventListener(
    props.video,
    'volumechange',
    () => (
        (settings.preview.video.volume = volume.setInternal(props.video.volume)),
        (settings.preview.video.muted = muted.setInternal(props.video.muted))
    )
);

useShortcut([' ', 'k'], () => (isPlaying.value = !isPlaying.value));
useShortcut('ArrowUp', () => ((volume.value += 0.1), (muted.value = false)));
useShortcut('ArrowDown', () => ((volume.value -= 0.1), (muted.value = false)));
useShortcut('m', () => (muted.value = !muted.value));
useShortcut('ArrowLeft', () => (time.value -= 5));
useShortcut('ArrowRight', () => (time.value += 5));
useShortcut('j', () => (time.value -= 10));
useShortcut('l', () => (time.value += 10));

const isMounted = ref(false);

const stringOrUndefined = (v: any) => (typeof v === 'string' ? v : undefined);
const isValidNum = (v: number) => !Number.isNaN(Number(v)) && Number.isFinite(v);
const getArtwork = (th: string, type: string) => ({
    src: getApiUrl(props.file.fullPath, { th, cache: '', no_fallback: '' }),
    type
});

onMounted(async () => {
    if (!('mediaSession' in navigator)) return;
    isMounted.value = true;

    const tags = shallowRef<Map<string, _JSONPrimitive>>();
    queryCache
        .refresh(queryCache.ensure(API.getListDirectoryQuery(props.file.fullPath.slice(0, -1))))
        .then((r) => (tags.value = r.data?.entries.find((v) => v.name === props.file.name)?.tags));

    watchEffect(() => {
        const title =
            stringOrUndefined((tags.value ?? props.file.tags).get('title')) ?? props.file.name;
        const album = stringOrUndefined((tags.value ?? props.file.tags).get('album'));
        const artist = stringOrUndefined((tags.value ?? props.file.tags).get('artist'));

        navigator.mediaSession.metadata = new MediaMetadata({
            title,
            album,
            artist,
            artwork: [
                getArtwork('w', 'image/webp'),
                getArtwork('x', 'image/jxl'),
                getArtwork('j', 'image/jpeg')
            ]
        });
    });

    navigator.mediaSession.setActionHandler('play', () => (isPlaying.value = true));
    navigator.mediaSession.setActionHandler('pause', () => (isPlaying.value = false));
    navigator.mediaSession.setActionHandler('stop', () => (isPlaying.value = false));
    navigator.mediaSession.setActionHandler('seekbackward', () => (time.value -= 10));
    navigator.mediaSession.setActionHandler('seekforward', () => (time.value += 10));
    navigator.mediaSession.setActionHandler(
        'seekto',
        (v) => v.seekTime != null && (time.value = v.seekTime)
    );

    watchEffect(
        () => (navigator.mediaSession.playbackState = isPlaying.value ? 'playing' : 'paused')
    );

    watchThrottled(
        () => [duration.value, time.value] as const,
        ([dur, pos]) =>
            // Could be called after unmount due to throttle
            isMounted.value &&
            isValidNum(dur) &&
            isValidNum(pos) &&
            navigator.mediaSession.setPositionState({
                duration: dur,
                position: Math.min(dur, pos)
            }),
        { throttle: 500 }
    );
});

onBeforeUnmount(() => {
    if (!('mediaSession' in navigator)) return;
    isMounted.value = false;
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = 'none';
    navigator.mediaSession.setActionHandler('play', null);
    navigator.mediaSession.setActionHandler('pause', null);
    navigator.mediaSession.setActionHandler('stop', null);
    navigator.mediaSession.setActionHandler('seekbackward', null);
    navigator.mediaSession.setActionHandler('seekforward', null);
    navigator.mediaSession.setActionHandler('seekto', null);
    navigator.mediaSession.setPositionState();
});
</script>

<template>
    <div class="vid-controls" :class>
        <Button variant="ghost" size="icon" @click="isPlaying = !isPlaying">
            <Pause v-if="isPlaying" />
            <Play v-else />
        </Button>
        <Slider
            :model-value="[time]"
            @update:model-value="
                (ev) => {
                    if (ev && !Number.isNaN(ev[0]) && Number.isFinite(ev[0])) {
                        try {
                            video.fastSeek(ev[0]);
                        } catch {}
                    }
                }
            "
            @value-commit="time = $event[0]"
            :max="duration"
            :loaded="buffered"
            :step="0.001"
        />
        <span class="timestamp"> {{ formatTimeNoMs(time) }} / {{ formatTimeNoMs(duration) }} </span>

        <HoverCard :open-delay="0">
            <HoverCardTrigger>
                <Button
                    variant="ghost"
                    size="icon"
                    @wheel="volume += $event.deltaY / -1000"
                    @pointerdown.stop
                    @click.stop="
                        () => {
                            if (volume !== 0) muted = !muted;
                            volume = volume || 1;
                        }
                    "
                >
                    <VolumeOff v-if="muted || !volume" />
                    <Volume2 v-else-if="volume === 1" />
                    <Volume1 v-else-if="volume >= 0.5" />
                    <Volume v-else />
                </Button>
            </HoverCardTrigger>
            <HoverCardContent class="w-min h-min p-0 py-2.5">
                <Slider
                    class="min-h-24! px-2.5"
                    @wheel="volume += $event.deltaY / -1000"
                    :model-value="[muted ? 0 : volume]"
                    orientation="vertical"
                    :max="1"
                    :step="0.001"
                    @update:model-value="
                        $event && (volume = $event[0]);
                        muted = false;
                    "
                />
            </HoverCardContent>
        </HoverCard>
    </div>
</template>

<style scoped>
@reference "@/style.css";

.vid-controls {
    @apply pointer-events-auto
        absolute left-5 right-5 sm:left-20 sm:right-20 h-8 px-1
        bg-accent rounded-md
        flex items-center gap-2;

    bottom: calc(var(--viewer-margin-bottom) - calc(var(--spacing) * 8));

    > [data-slot='slider'] {
        @apply flex-1 h-8;
    }

    .timestamp {
        @apply min-w-[10ch] text-center;
    }
}
</style>
