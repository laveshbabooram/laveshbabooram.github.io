"""Build the site's images: resize to what is actually displayed, then write
AVIF (first choice) and WebP (fallback) into public/img/.

    python -I tools/optimize_images.py [SOURCE_DIR]

SOURCE_DIR defaults to the v1 site (the parent folder), where most original,
full-size files live (newer ones sit in tools/src-img/). Outputs are committed; sources are not needed again
unless an image changes.
"""
import io
import pathlib
import sys

from PIL import Image, ImageCms, ImageFilter, ImageOps

HERE = pathlib.Path(__file__).resolve().parent.parent
SRC = pathlib.Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else HERE.parent
OUT = HERE / "public" / "img"
OUT.mkdir(parents=True, exist_ok=True)

# name: (source, max width, crop box as fractions (l, t, r, b) or None)
JOBS = {
    "portrait": ("profile-photo.jpg", 640, (0.262, 0.0, 0.749, 1.0)),
    "minifactory": ("public/minifactory3d-screenshot.png", 1200, None),
    "cover-ai-sdgs": ("public/cover-ai-sdgs.png", 300, None),
    "cover-ml-traffic": ("public/cover-ml-traffic.png", 300, None),
    "cover-cloud-ml": ("public/cover-cloud-ml.png", 300, None),
    "cover-emerald-blockchain": ("public/cover-emerald-blockchain.png", 300, None),
    "cover-5g-6g": ("public/cover-5g-6g.png", 300, None),
    # Not in v1: the original lives in this project (publisher jacket image).
    "cover-6g-ntn": (HERE / "tools" / "src-img" / "cover-6g-ntn.jpg", 300, None),
    "about-icqcc-award": ("public/about-icqcc-award.jpg", 240, None),
    "about-medal": ("public/about-medal.jpg", 240, None),
    "about-curiosity": ("public/about-curiosity.jpg", 240, None),
}


def main():
    total_in = total_out = 0
    for name, (src, max_w, crop) in JOBS.items():
        path = SRC / src
        im = ImageOps.exif_transpose(Image.open(path))
        icc = im.info.get("icc_profile")
        if icc and im.mode in ("CMYK", "RGB"):
            # Colour-manage into sRGB, then drop the (sometimes 500 KB) profile.
            src_prof = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            im = ImageCms.profileToProfile(im, src_prof, ImageCms.createProfile("sRGB"), outputMode="RGB")
        im.info.pop("icc_profile", None)
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGB")
        if im.mode == "RGBA" and im.getextrema()[3][0] == 255:
            im = im.convert("RGB")          # drop an alpha channel that is fully opaque
        if crop:
            w, h = im.size
            l, t, r, b = crop
            im = im.crop((round(l * w), round(t * h), round(r * w), round(b * h)))
        if im.width > max_w:
            im = im.resize((max_w, round(im.height * max_w / im.width)), Image.LANCZOS)

        if name == "portrait":
            # Black-and-white photo with heavy film grain: grain is what costs
            # bytes. Smooth it lightly and keep it single-channel.
            im = im.convert("L").filter(ImageFilter.GaussianBlur(0.7)).convert("RGB")

        photo = name == "portrait" or name.startswith("about-")
        avif = OUT / f"{name}.avif"
        webp = OUT / f"{name}.webp"
        im.save(avif, "AVIF", quality=50 if photo else 60, speed=4, icc_profile=b"")
        im.save(webp, "WEBP", quality=74 if photo else 80, method=6)

        size_in = path.stat().st_size
        total_in += size_in
        total_out += avif.stat().st_size + webp.stat().st_size
        print(f"{name:26} {im.width:>5}x{im.height:<5} {size_in // 1024:>6} KB -> "
              f"avif {avif.stat().st_size // 1024:>4} KB, webp {webp.stat().st_size // 1024:>4} KB")
    print(f"\nsources {total_in // 1024} KB -> outputs {total_out // 1024} KB (both formats)")


if __name__ == "__main__":
    main()
