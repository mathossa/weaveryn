from __future__ import annotations

import io
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter


@dataclass(frozen=True)
class Artwork:
    name: str
    path: str
    title: str
    prompt: str
    width: int = 1536
    height: int = 1024
    seed: int = 114
    target_min: int = 120_000
    target_max: int = 220_000


STYLE = (
    'Painterly grounded fantasy concept art for Weaveryn, cinematic but restrained, '
    'near-black and deep-blue shadows, antique-gold and ember practical light, natural '
    'stone wood cloth leather and metal, atmospheric depth, nuanced texture, readable '
    'silhouette at small card size, landscape composition with the important subject '
    'safe near the center for square and wide crops. No text, no letters, no numbers, '
    'no logo, no watermark, no frame, no border, no UI, no heraldic brand marks, no '
    'recognizable franchise or copyrighted character. Avoid glossy mobile-game art, '
    'oversaturated magic, muddy underexposure, and obvious bilateral AI symmetry.'
)

ARTWORK = [
    Artwork(
        'person',
        'public/images/entities/person.webp',
        'The Many Faces',
        'A small ensemble of five distinct original fantasy people standing naturally '
        'together in a weathered stone wayhouse: varied ages, appearances, builds, '
        'clothing and social roles, from traveler and scholar to craftsperson and guard; '
        'individual personalities without stereotypes; warm doorway light behind them. '
        + STYLE,
        seed=11401,
    ),
    Artwork(
        'location',
        'public/images/entities/location.webp',
        'A Place in the World',
        'A believable lived-in fantasy settlement in a mountain river valley, clustered '
        'stone and timber roofs around an old hill keep, bridge and winding road, distant '
        'ridges and cool mist, a few warm windows; strong sense of geography and place. '
        + STYLE,
        seed=11402,
    ),
    Artwork(
        'organization',
        'public/images/entities/organization.webp',
        'The Convening',
        'An original fantasy council or organized gathering around a large circular map '
        'table in a tall civic chamber, six varied members focused on a shared purpose, '
        'maps and tokens but no readable writing and no heraldry; collaborative rather '
        'than militaristic. '
        + STYLE,
        seed=11403,
    ),
    Artwork(
        'item',
        'public/images/entities/item.webp',
        'Relic of the Unknown',
        'One original mysterious fantasy relic displayed on a worn dark map table: an '
        'aged bronze armillary-like cage surrounding a fractured cool-blue mineral core, '
        'a strong unmistakable silhouette, tactile patina, subtle reflected candlelight, '
        'no readable runes. '
        + STYLE,
        seed=11404,
        target_min=100_000,
        target_max=200_000,
    ),
    Artwork(
        'event',
        'public/images/entities/event.webp',
        'The Turning Hour',
        'A consequential fantasy event seen from a rocky overlook: several travelers and '
        'townsfolk witness a brilliant celestial ember or comet crossing a storm-dark '
        'night sky above distant mountains, torches in the foreground, anticipation and '
        'change rather than battle. '
        + STYLE,
        seed=11405,
    ),
    Artwork(
        'deity',
        'public/images/entities/deity.webp',
        'The Silent Divinity',
        'A monumental original and religiously neutral supernatural stone presence in a '
        'vast cavern sanctuary, serene abstract humanoid statue with concentric weathered '
        'metal rings behind it, tiny visitors and candles establishing scale, no symbols '
        'from any real-world religion. '
        + STYLE,
        seed=11406,
    ),
    Artwork(
        'creature',
        'public/images/entities/creature.webp',
        'Beyond the Firelight',
        'An original fantasy forest beast emerging beyond firelight: low powerful '
        'quadruped with pale mossy hide, branching bone antlers and a ridge of short '
        'natural spines, alert intelligent posture in deep trees and mist; clearly not a '
        'dragon and not based on any franchise creature. '
        + STYLE,
        seed=11407,
    ),
    Artwork(
        'quest',
        'public/images/entities/quest.webp',
        'The Road Ahead',
        'An unresolved fantasy journey: a lone cloaked traveler holding a warm lantern at '
        'a fork in a mountain road, looking toward a remote old tower on a ridge at dusk; '
        'layered valleys, route and destination visible, quiet sense of purpose, no signs '
        'with readable text. '
        + STYLE,
        seed=11408,
        target_min=110_000,
        target_max=210_000,
    ),
    Artwork(
        'generic',
        'public/images/entities/generic.webp',
        'The Unwritten Archive',
        'A mysterious unlabeled fantasy archive for an unknown concept: candlelit wooden '
        'shelves and specimen drawers around an open blank codex on a worktable, with a '
        'subtle constellation of connected warm points suspended in the dark air, '
        'suggesting records not yet categorized. '
        + STYLE,
        seed=11409,
        target_min=100_000,
        target_max=200_000,
    ),
    Artwork(
        'entity-banner',
        'public/images/backgrounds/entity-banner.webp',
        "The Cartographer's Hall",
        'A panoramic candlelit fantasy cartographer and worldbuilding hall, long map table '
        'with rolled charts, shelves, instruments, cabinets and a few quiet scholars at '
        'the far left and right; deep blue-black room with restrained antique-gold lamps. '
        'The central third is intentionally calmer and less busy for responsive overlay '
        'and narrow crops while still feeling richly atmospheric. '
        + STYLE,
        width=2160,
        height=720,
        seed=11410,
        target_min=100_000,
        target_max=220_000,
    ),
]


def generation_url(artwork: Artwork) -> str:
    prompt = urllib.parse.quote(artwork.prompt, safe='')
    params = urllib.parse.urlencode(
        {
            'model': 'flux',
            'seed': artwork.seed,
            'width': artwork.width,
            'height': artwork.height,
            'nologo': 'true',
            'private': 'true',
            'safe': 'true',
            'enhance': 'false',
        }
    )
    return f'https://image.pollinations.ai/prompt/{prompt}?{params}'


def fetch_source(artwork: Artwork) -> bytes:
    request = urllib.request.Request(
        generation_url(artwork),
        headers={
            'User-Agent': 'Weaveryn-Issue-114/1.0',
            'Accept': 'image/*',
        },
    )
    last_error: Exception | None = None
    for attempt in range(2):
        try:
            with urllib.request.urlopen(request, timeout=300) as response:
                content_type = response.headers.get('content-type', '')
                data = response.read()
                if not content_type.startswith('image/'):
                    raise RuntimeError(
                        f'{artwork.name}: expected image response, got {content_type}'
                    )
                if len(data) < 20_000:
                    raise RuntimeError(
                        f'{artwork.name}: image response unexpectedly small ({len(data)} bytes)'
                    )
                return data
        except (urllib.error.URLError, TimeoutError, RuntimeError) as error:
            last_error = error
            if attempt == 0:
                time.sleep(8)
    raise RuntimeError(f'{artwork.name}: image generation failed') from last_error


def center_crop(image: Image.Image, width: int, height: int) -> Image.Image:
    source_ratio = image.width / image.height
    target_ratio = width / height
    if source_ratio > target_ratio:
        crop_width = round(image.height * target_ratio)
        left = max(0, (image.width - crop_width) // 2)
        image = image.crop((left, 0, left + crop_width, image.height))
    elif source_ratio < target_ratio:
        crop_height = round(image.width / target_ratio)
        top = max(0, (image.height - crop_height) // 2)
        image = image.crop((0, top, image.width, top + crop_height))
    return image.resize((width, height), Image.Resampling.LANCZOS)


def prepare_image(data: bytes, artwork: Artwork) -> Image.Image:
    with Image.open(io.BytesIO(data)) as source:
        image = source.convert('RGB')
    image = center_crop(image, artwork.width, artwork.height)
    # Very light finishing keeps the set coherent without turning the generation into
    # a different image or crushing the shadow detail.
    image = ImageEnhance.Color(image).enhance(0.92)
    image = ImageEnhance.Contrast(image).enhance(1.04)
    image = image.filter(ImageFilter.UnsharpMask(radius=0.8, percent=65, threshold=3))
    return image


def encode_webp(image: Image.Image, quality: int) -> bytes:
    stream = io.BytesIO()
    image.save(
        stream,
        'WEBP',
        quality=quality,
        method=6,
        exif=b'',
        icc_profile=None,
    )
    return stream.getvalue()


def choose_webp(image: Image.Image, artwork: Artwork) -> tuple[bytes, int]:
    candidates: list[tuple[int, bytes]] = []
    for quality in range(94, 71, -1):
        data = encode_webp(image, quality)
        if len(data) <= 250_000:
            candidates.append((quality, data))
    if not candidates:
        raise RuntimeError(f'{artwork.name}: could not meet 250 KB hard maximum')

    midpoint = (artwork.target_min + artwork.target_max) / 2
    in_target = [
        (quality, data)
        for quality, data in candidates
        if artwork.target_min <= len(data) <= artwork.target_max
    ]
    pool = in_target or candidates
    quality, data = min(pool, key=lambda candidate: abs(len(candidate[1]) - midpoint))
    return data, quality


def main() -> None:
    for index, artwork in enumerate(ARTWORK):
        print(f'Generating {artwork.title} -> {artwork.path}')
        source = fetch_source(artwork)
        image = prepare_image(source, artwork)
        encoded, quality = choose_webp(image, artwork)
        path = Path(artwork.path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(encoded)
        print(
            f'  {artwork.width}x{artwork.height}, quality={quality}, '
            f'{len(encoded) / 1000:.1f} KB, seed={artwork.seed}'
        )
        if index != len(ARTWORK) - 1:
            # Public endpoint documents a five-second interval per IP.
            time.sleep(6)


if __name__ == '__main__':
    main()
