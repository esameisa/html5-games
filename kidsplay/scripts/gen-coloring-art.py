"""Generates original line-art coloring templates (SVG 400x400, black outlines, closed regions)."""
import os, math, json
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'coloring')
os.makedirs(OUT, exist_ok=True)

def wrap(body):
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">'
            '<g fill="none" stroke="#1d1d1f" stroke-width="5" stroke-linejoin="round" stroke-linecap="round">'
            + body + '</g></svg>')

def sun(x, y, r=28):
    rays = ''.join(f'<line x1="{x+math.cos(a)*(r+8):.1f}" y1="{y+math.sin(a)*(r+8):.1f}" x2="{x+math.cos(a)*(r+20):.1f}" y2="{y+math.sin(a)*(r+20):.1f}"/>' for a in [i*math.pi/4 for i in range(8)])
    return f'<circle cx="{x}" cy="{y}" r="{r}"/>' + rays

def ground(y=340):
    return f'<path d="M0 {y} Q100 {y-15} 200 {y} T400 {y}"/>'

def flower(x, y, r=14):
    petals = ''.join(f'<circle cx="{x+math.cos(a)*r:.1f}" cy="{y+math.sin(a)*r:.1f}" r="{r*0.75:.1f}"/>' for a in [i*2*math.pi/5 for i in range(5)])
    return f'<line x1="{x}" y1="{y+r}" x2="{x}" y2="{y+60}"/>' + petals + f'<circle cx="{x}" cy="{y}" r="{r*0.6:.1f}"/>'

def cloud(x, y):
    return f'<path d="M{x-40} {y} a20 20 0 0 1 20 -25 a25 25 0 0 1 45 0 a20 20 0 0 1 15 25 Z"/>'

T = {}
T['cat'] = ('animals', 'Cat', 'قطة', sun(330, 60) + ground() +
  '<ellipse cx="200" cy="270" rx="90" ry="65"/><circle cx="200" cy="160" r="70"/><path d="M145 120 L135 60 L180 95"/><path d="M255 120 L265 60 L220 95"/>'
  '<circle cx="175" cy="150" r="12"/><circle cx="225" cy="150" r="12"/><path d="M192 178 L208 178 L200 188 Z"/><path d="M200 188 Q190 200 180 195 M200 188 Q210 200 220 195"/>'
  '<path d="M150 180 L110 172 M150 188 L110 192 M250 180 L290 172 M250 188 L290 192"/><path d="M285 280 Q350 260 330 200"/><ellipse cx="160" cy="330" rx="25" ry="12"/><ellipse cx="240" cy="330" rx="25" ry="12"/>')
T['puppy'] = ('animals', 'Puppy', 'جرو', cloud(80, 70) + ground() +
  '<ellipse cx="200" cy="275" rx="95" ry="60"/><circle cx="200" cy="160" r="68"/><path d="M140 120 Q100 130 110 210 Q135 200 145 160"/><path d="M260 120 Q300 130 290 210 Q265 200 255 160"/>'
  '<circle cx="178" cy="150" r="10"/><circle cx="222" cy="150" r="10"/><ellipse cx="200" cy="185" rx="28" ry="20"/><ellipse cx="200" cy="176" rx="11" ry="8"/><path d="M190 198 Q200 212 210 198"/>'
  '<circle cx="230" cy="250" r="22"/><path d="M290 270 Q330 240 320 215"/><rect x="150" y="215" width="100" height="16" rx="8"/>')
T['fish'] = ('ocean', 'Fish', 'سمكة',
  '<path d="M80 200 Q170 100 280 200 Q170 300 80 200 Z"/><path d="M280 200 L350 140 L340 200 L350 260 Z"/><circle cx="130" cy="190" r="14"/><path d="M180 140 Q200 200 180 260"/><path d="M220 145 Q240 200 220 255"/>'
  '<path d="M170 125 L200 90 L235 130"/><circle cx="60" cy="110" r="12"/><circle cx="80" cy="70" r="8"/><circle cx="320" cy="80" r="15"/>'
  '<path d="M20 380 Q40 320 30 300 M60 380 Q80 330 60 310 M360 380 Q350 330 370 300"/><path d="M0 360 Q100 345 200 360 T400 360"/>')
T['butterfly'] = ('nature', 'Butterfly', 'فراشة',
  '<ellipse cx="200" cy="200" rx="14" ry="80"/><circle cx="200" cy="110" r="18"/><path d="M193 95 Q170 50 155 45 M207 95 Q230 50 245 45"/>'
  '<path d="M186 160 Q80 60 60 140 Q50 210 186 210 Z"/><path d="M214 160 Q320 60 340 140 Q350 210 214 210 Z"/><path d="M186 220 Q90 230 100 300 Q130 330 190 250 Z"/><path d="M214 220 Q310 230 300 300 Q270 330 210 250 Z"/>'
  '<circle cx="120" cy="140" r="20"/><circle cx="280" cy="140" r="20"/><circle cx="140" cy="270" r="14"/><circle cx="260" cy="270" r="14"/>' + flower(60, 330, 12) + flower(340, 330, 12))
T['trex'] = ('dinosaurs', 'T-Rex', 'تي ريكس', sun(60, 60, 24) + ground(350) +
  '<path d="M120 300 Q100 200 170 170 L180 110 Q190 60 260 70 Q320 80 320 120 Q320 150 270 150 L250 155 Q260 200 250 240 Q240 300 200 310 Z"/>'
  '<path d="M120 300 Q60 310 30 270 Q80 290 130 260"/><circle cx="275" cy="100" r="9"/><path d="M270 135 L280 128 L290 135 L300 128 L310 135"/><path d="M240 190 L270 205 L262 215"/>'
  '<rect x="150" y="300" width="30" height="50" rx="10"/><rect x="200" y="300" width="30" height="50" rx="10"/><path d="M175 180 L190 165 M160 210 L175 195"/>')
T['stego'] = ('dinosaurs', 'Stegosaurus', 'ستيغوسورس', cloud(320, 60) + ground(350) +
  '<ellipse cx="200" cy="250" rx="120" ry="60"/><path d="M90 260 Q40 270 20 240 Q60 250 85 235"/><path d="M315 240 Q350 220 360 240 Q370 265 330 270"/><circle cx="345" cy="245" r="5"/>'
  '<path d="M110 205 L120 160 L145 195"/><path d="M145 195 L165 140 L190 190"/><path d="M190 190 L210 130 L235 190"/><path d="M235 190 L260 145 L275 200"/><path d="M275 200 L300 170 L305 215"/>'
  '<rect x="120" y="290" width="30" height="55" rx="10"/><rect x="250" y="290" width="30" height="55" rx="10"/><circle cx="180" cy="245" r="14"/><circle cx="230" cy="260" r="10"/>')
T['sunflower'] = ('flowers', 'Sunflower', 'دوّار الشمس', ground(370) +
  ''.join(f'<ellipse cx="{200+math.cos(a)*62:.1f}" cy="{150+math.sin(a)*62:.1f}" rx="32" ry="16" transform="rotate({math.degrees(a):.0f} {200+math.cos(a)*62:.1f} {150+math.sin(a)*62:.1f})"/>' for a in [i*math.pi/6 for i in range(12)])
  + '<circle cx="200" cy="150" r="45"/><circle cx="185" cy="140" r="6"/><circle cx="215" cy="140" r="6"/><path d="M180 165 Q200 180 220 165"/><path d="M200 195 L200 370"/><path d="M200 280 Q150 250 130 270 Q160 300 200 290"/><path d="M200 320 Q250 290 270 310 Q240 340 200 330"/>')
T['tulips'] = ('flowers', 'Tulips', 'زهور التوليب', sun(340, 60, 24) +
  ''.join(f'<path d="M{x-30} {y} L{x-30} {y-40} L{x-15} {y-25} L{x} {y-45} L{x+15} {y-25} L{x+30} {y-40} L{x+30} {y} Q{x} {y+25} {x-30} {y} Z"/><path d="M{x} {y+12} L{x} 330"/><path d="M{x} {y+80} Q{x-40} {y+50} {x-45} {y+70} Q{x-25} {y+95} {x} {y+90}"/>' for x, y in [(100, 160), (200, 130), (300, 170)])
  + '<path d="M60 330 L340 330 L310 390 L90 390 Z"/><path d="M75 350 L325 350"/>')
T['car'] = ('cars', 'Car', 'سيارة', cloud(80, 60) + sun(330, 60, 24) +
  '<path d="M40 280 L50 220 L120 210 L160 150 L260 150 L300 210 L360 220 L370 280 Z"/><path d="M135 210 L170 165 L210 165 L210 210 Z"/><path d="M225 165 L255 165 L285 210 L225 210 Z"/>'
  '<circle cx="110" cy="285" r="35"/><circle cx="110" cy="285" r="14"/><circle cx="300" cy="285" r="35"/><circle cx="300" cy="285" r="14"/><rect x="345" y="230" width="20" height="14" rx="4"/><path d="M190 240 L215 240"/>'
  '<path d="M0 330 L400 330"/><path d="M30 360 L90 360 M160 360 L220 360 M290 360 L350 360"/>')
T['truck'] = ('cars', 'Fire Truck', 'شاحنة إطفاء',
  '<rect x="40" y="170" width="200" height="110" rx="10"/><path d="M240 280 L240 140 L320 140 L360 200 L360 280 Z"/><path d="M255 155 L310 155 L340 200 L255 200 Z"/>'
  '<path d="M60 150 L220 110 M60 165 L220 125 M90 142 L95 156 M130 132 L135 146 M170 122 L175 136"/><circle cx="100" cy="290" r="32"/><circle cx="100" cy="290" r="12"/><circle cx="300" cy="290" r="32"/><circle cx="300" cy="290" r="12"/>'
  '<rect x="60" y="195" width="60" height="60" rx="6"/><rect x="140" y="195" width="80" height="30" rx="6"/><circle cx="290" cy="130" r="10"/><path d="M0 340 L400 340"/>')
T['robot'] = ('robots', 'Robot', 'روبوت',
  '<rect x="130" y="70" width="140" height="110" rx="20"/><line x1="200" y1="70" x2="200" y2="40"/><circle cx="200" cy="32" r="10"/><circle cx="170" cy="115" r="16"/><circle cx="230" cy="115" r="16"/><rect x="165" y="145" width="70" height="18" rx="6"/>'
  '<path d="M180 145 L180 163 M200 145 L200 163 M220 145 L220 163"/><rect x="120" y="190" width="160" height="120" rx="16"/><rect x="155" y="210" width="90" height="50" rx="8"/><circle cx="175" cy="285" r="10"/><circle cx="225" cy="285" r="10"/>'
  '<rect x="80" y="200" width="30" height="90" rx="12"/><rect x="290" y="200" width="30" height="90" rx="12"/><rect x="145" y="315" width="40" height="55" rx="10"/><rect x="215" y="315" width="40" height="55" rx="10"/><rect x="110" y="120" width="20" height="30" rx="6"/><rect x="270" y="120" width="20" height="30" rx="6"/>')
T['robot-dog'] = ('robots', 'Robot Dog', 'كلب آلي', ground(360) +
  '<rect x="90" y="190" width="200" height="100" rx="24"/><rect x="250" y="110" width="110" height="90" rx="20"/><path d="M265 110 L270 70 L295 110 M330 110 L340 70 L350 110"/><circle cx="285" cy="150" r="12"/><circle cx="330" cy="150" r="12"/><rect x="345" y="170" width="25" height="18" rx="6"/>'
  '<rect x="110" y="290" width="30" height="60" rx="8"/><rect x="240" y="290" width="30" height="60" rx="8"/><path d="M90 220 L50 180 L60 170"/><circle cx="150" cy="240" r="20"/><circle cx="210" cy="240" r="20"/>')
T['house'] = ('houses', 'House', 'منزل', sun(340, 60, 24) + cloud(90, 60) + ground(350) +
  '<path d="M70 190 L200 90 L330 190 Z"/><rect x="95" y="190" width="210" height="155"/><rect x="175" y="260" width="50" height="85" rx="6"/><circle cx="215" cy="305" r="4"/>'
  '<rect x="115" y="215" width="45" height="45"/><path d="M137 215 L137 260 M115 237 L160 237"/><rect x="240" y="215" width="45" height="45"/><path d="M262 215 L262 260 M240 237 L285 237"/><rect x="250" y="105" width="30" height="50"/>'
  + flower(40, 300, 10) + flower(360, 300, 10))
T['castle'] = ('houses', 'Castle', 'قلعة', cloud(320, 50) +
  '<rect x="110" y="170" width="180" height="180"/><path d="M110 170 L110 150 L135 150 L135 170 M160 170 L160 150 L185 150 L185 170 M215 170 L215 150 L240 150 L240 170 M265 170 L265 150 L290 150 L290 170"/>'
  '<rect x="50" y="130" width="60" height="220"/><path d="M40 130 L80 70 L120 130 Z"/><rect x="290" y="130" width="60" height="220"/><path d="M280 130 L320 70 L360 130 Z"/><path d="M80 70 L80 40 L105 50 L80 60"/><path d="M320 70 L320 40 L345 50 L320 60"/>'
  '<path d="M170 350 L170 290 Q200 255 230 290 L230 350 Z"/><circle cx="200" cy="215" r="18"/><rect x="65" y="170" width="30" height="35" rx="15"/><rect x="305" y="170" width="30" height="35" rx="15"/><path d="M0 350 L400 350"/>')
T['rocket'] = ('space', 'Rocket', 'صاروخ', '<circle cx="70" cy="70" r="30"/><path d="M40 70 Q70 85 100 70"/><circle cx="340" cy="330" r="40"/><ellipse cx="340" cy="330" rx="70" ry="14"/>'
  + ''.join(f'<path d="M{x} {y-8} L{x+3} {y-2} L{x+9} {y} L{x+3} {y+2} L{x} {y+8} L{x-3} {y+2} L{x-9} {y} L{x-3} {y-2} Z"/>' for x, y in [(330, 60), (60, 300), (120, 190), (300, 200)]) +
  '<path d="M200 40 Q260 110 255 260 L145 260 Q140 110 200 40 Z"/><path d="M200 40 Q225 70 235 100 L165 100 Q175 70 200 40 Z"/><circle cx="200" cy="160" r="26"/><circle cx="200" cy="160" r="16"/>'
  '<path d="M145 210 L100 290 L148 260"/><path d="M255 210 L300 290 L252 260"/><path d="M170 260 Q200 360 230 260"/><path d="M185 260 Q200 320 215 260"/>')
T['astronaut'] = ('space', 'Astronaut', 'رائد فضاء', '<circle cx="330" cy="70" r="35"/><path d="M310 60 a10 10 0 1 0 1 0"/>' +
  '<circle cx="200" cy="130" r="75"/><rect x="150" y="95" width="100" height="65" rx="30"/><rect x="140" y="200" width="120" height="120" rx="30"/><rect x="170" y="225" width="60" height="40" rx="8"/><circle cx="185" cy="245" r="7"/><circle cx="215" cy="245" r="7"/>'
  '<rect x="90" y="210" width="45" height="30" rx="14" transform="rotate(-30 112 225)"/><rect x="265" y="210" width="45" height="30" rx="14" transform="rotate(30 287 225)"/><rect x="155" y="320" width="35" height="50" rx="10"/><rect x="210" y="320" width="35" height="50" rx="10"/>'
  '<path d="M0 380 Q200 340 400 380"/><circle cx="60" cy="360" r="10"/><circle cx="340" cy="365" r="14"/>')
T['owl'] = ('animals', 'Owl', 'بومة', '<path d="M20 330 Q200 300 380 330"/><path d="M40 330 L60 400 M340 330 L330 400"/>' + '<circle cx="330" cy="60" r="30"/>' +
  '<ellipse cx="200" cy="210" rx="100" ry="115"/><path d="M120 120 L110 70 L160 105"/><path d="M280 120 L290 70 L240 105"/><circle cx="160" cy="165" r="35"/><circle cx="240" cy="165" r="35"/><circle cx="160" cy="165" r="14"/><circle cx="240" cy="165" r="14"/>'
  '<path d="M190 200 L210 200 L200 222 Z"/><ellipse cx="200" cy="270" rx="55" ry="50"/><path d="M175 255 Q185 265 195 255 M205 255 Q215 265 225 255 M190 285 Q200 295 210 285"/><path d="M100 210 Q70 260 110 300"/><path d="M300 210 Q330 260 290 300"/>')

meta = []
for tid, (theme, en, ar, body) in T.items():
    with open(os.path.join(OUT, tid + '.svg'), 'w') as f:
        f.write(wrap(body))
    meta.append({"id": tid, "theme": theme, "title": {"en": en, "ar": ar}, "image": f"assets/coloring/{tid}.svg"})
pack = {"schemaVersion": 1, "id": "coloring-core", "version": "1.0.0", "type": "coloring_templates", "minAppVersion": "1.0.0",
        "title": {"en": "Coloring Book", "ar": "كتاب التلوين"}, "languages": ["en", "ar"], "assets": [], "levels": meta, "sizeBytes": 0}
dst = os.path.join(os.path.dirname(__file__), '..', 'src', 'games', 'color-splash', 'templates.json')
os.makedirs(os.path.dirname(dst), exist_ok=True)
json.dump(pack, open(dst, 'w'), ensure_ascii=False, indent=1)
print(len(T), 'templates')
