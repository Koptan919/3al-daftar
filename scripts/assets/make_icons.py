#!/usr/bin/env python3
# بيرسم أيقونات التطبيق (assets/). الاستعمال: python3 scripts/assets/make_icons.py <جذر المشروع> <مجلد الناتج>
import sys, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
ROOT, OUT = sys.argv[1], sys.argv[2]
FONT = ROOT + '/node_modules/@expo-google-fonts/tajawal/900Black/Tajawal_900Black.ttf'
BG = (11, 12, 15)

def lin_grad(size, stops, angle_deg):
    w, h = size
    g = Image.new('RGB', size)
    px = g.load()
    a = math.radians(angle_deg); dx, dy = math.cos(a), math.sin(a)
    L = abs(w*dx) + abs(h*dy)
    for y in range(h):
        for x in range(w):
            t = ((x - w/2)*dx + (y - h/2)*dy)/L + 0.5
            t = min(1, max(0, t))
            for i in range(len(stops)-1):
                t0, c0 = stops[i]; t1, c1 = stops[i+1]
                if t <= t1:
                    k = (t - t0)/(t1 - t0) if t1 > t0 else 0
                    px[x, y] = tuple(int(c0[j] + (c1[j]-c0[j])*k) for j in range(3)); break
    return g

def rounded_mask(size, box, r):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).rounded_rectangle(box, r, fill=255)
    return m

def letter_mask(size, text, font_px, center):
    m = Image.new('L', size, 0)
    f = ImageFont.truetype(FONT, font_px)
    d = ImageDraw.Draw(m)
    bb = d.textbbox((0, 0), text, font=f)
    x = center[0] - (bb[0]+bb[2])/2; y = center[1] - (bb[1]+bb[3])/2
    d.text((x, y), text, font=f, fill=255)
    return m

def mark(S, frac):
    """الشعار: مربّع عنابي مدوّر (دفتر) فيه «د» معدنية + خطوط سطور الدفتر"""
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    side = int(S*frac); o = (S - side)//2
    box = (o, o, o+side, o+side); r = int(side*0.24)
    # ظل
    sh = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    shm = rounded_mask((S, S), (o, o + side*0.04, o+side, o+side*1.04), r).filter(ImageFilter.GaussianBlur(side*0.05))
    sh.putalpha(shm.point(lambda v: int(v*0.55)))
    img = Image.alpha_composite(img, sh)
    burg = lin_grad((S, S), [(0, (201, 65, 106)), (0.45, (155, 37, 70)), (1, (110, 23, 48))], 50).convert('RGBA')
    m = rounded_mask((S, S), box, r)
    burg.putalpha(m)
    img = Image.alpha_composite(img, burg)
    # لمعة فوق
    hl = Image.new('RGBA', (S, S), (255, 255, 255, 0))
    hlm = Image.new('L', (S, S), 0)
    ImageDraw.Draw(hlm).ellipse((o - side*0.3, o - side*0.75, o + side*1.3, o + side*0.42), fill=22)
    hl.putalpha(ImageChops.multiply(hlm, m))
    img = Image.alpha_composite(img, hl)
    # حرف «د» معدني
    metal = lin_grad((S, S), [(0, (246, 247, 249)), (0.5, (205, 209, 216)), (1, (150, 156, 166))], 70).convert('RGBA')
    lm = letter_mask((S, S), 'د', int(side*1.35), (S/2 + side*0.02, S/2))
    lsh = Image.new('RGBA', (S, S), (60, 8, 24, 0)); lsh.putalpha(lm.filter(ImageFilter.GaussianBlur(side*0.02)).point(lambda v: int(v*0.6)))
    img = Image.alpha_composite(img, ImageChops.offset(lsh, 0, int(side*0.015)))
    metal.putalpha(lm)
    img = Image.alpha_composite(img, metal)
    return img, m, lm

def save(img, name, size, mode='RGBA'):
    img.resize((size, size), Image.LANCZOS).convert(mode).save(f'{OUT}/{name}')

W = 1024
# الأيقونة الكاملة (iOS/عام): خلفية غامقة + إضاءة عنابية + الشعار
bg = Image.new('RGBA', (W, W), BG + (255,))
glow = Image.new('RGBA', (W, W), (155, 37, 70, 0)); gm = Image.new('L', (W, W), 0)
ImageDraw.Draw(gm).ellipse((W*0.45, -W*0.35, W*1.35, W*0.45), fill=150)
ImageDraw.Draw(gm).ellipse((-W*0.4, W*0.55, W*0.5, W*1.4), fill=90)
glow.putalpha(gm.filter(ImageFilter.GaussianBlur(W*0.12)))
bg = Image.alpha_composite(bg, glow)
m, _, _ = mark(W, 0.62)
save(Image.alpha_composite(bg, m), 'icon.png', 1024, 'RGB')
# أندرويد adaptive: الخلفية لحال، والشعار بالمنطقة الآمنة (~60%)
save(bg, 'android-icon-background.png', 512)
fg, _, _ = mark(W, 0.6)
save(fg, 'android-icon-foreground.png', 512)
# أحادي اللون: مربّع مدوّر و«د» مفرّغة
_, sq, lm = mark(W, 0.6)
mono = Image.new('RGBA', (W, W), (255, 255, 255, 0))
mono.putalpha(ImageChops.subtract(sq, lm))
save(mono, 'android-icon-monochrome.png', 432)
# splash + favicon
sp, _, _ = mark(W, 0.9)
save(sp, 'splash-icon.png', 1024)
save(Image.alpha_composite(bg, m), 'favicon.png', 48)
