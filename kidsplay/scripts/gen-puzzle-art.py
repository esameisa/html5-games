"""Generates the original bundled puzzle illustrations (SVG, 600x600)."""
import os, math
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'puzzles')
os.makedirs(OUT, exist_ok=True)

def svg(body, sky=('#7ec8ff', '#d6f0ff')):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{sky[0]}"/><stop offset="1" stop-color="{sky[1]}"/></linearGradient></defs>
<rect width="600" height="600" fill="url(#sky)"/>
{body}
</svg>'''

def sun(x, y, r=50, c='#ffd54f'):
    rays = ''.join(f'<line x1="{x+math.cos(a)*(r+10):.1f}" y1="{y+math.sin(a)*(r+10):.1f}" x2="{x+math.cos(a)*(r+35):.1f}" y2="{y+math.sin(a)*(r+35):.1f}" stroke="{c}" stroke-width="10" stroke-linecap="round"/>' for a in [i*math.pi/6 for i in range(12)])
    return rays + f'<circle cx="{x}" cy="{y}" r="{r}" fill="{c}"/><circle cx="{x-15}" cy="{y-8}" r="5" fill="#5d4037"/><circle cx="{x+15}" cy="{y-8}" r="5" fill="#5d4037"/><path d="M{x-18} {y+12} Q{x} {y+30} {x+18} {y+12}" stroke="#5d4037" stroke-width="5" fill="none" stroke-linecap="round"/>'

def cloud(x, y, s=1):
    return f'<g transform="translate({x} {y}) scale({s})" fill="#fff"><ellipse cx="0" cy="0" rx="60" ry="25"/><ellipse cx="30" cy="-18" rx="38" ry="28"/><ellipse cx="-28" cy="-10" rx="30" ry="20"/></g>'

def tree(x, y, s=1, c='#43a047'):
    return f'<g transform="translate({x} {y}) scale({s})"><rect x="-10" y="-10" width="20" height="60" fill="#8d6e63"/><circle cx="0" cy="-40" r="45" fill="{c}"/><circle cx="-28" cy="-18" r="28" fill="#66bb6a"/><circle cx="28" cy="-22" r="28" fill="#2e7d32"/></g>'

def flower(x, y, c):
    petals = ''.join(f'<circle cx="{x+math.cos(a)*12:.1f}" cy="{y+math.sin(a)*12:.1f}" r="10" fill="{c}"/>' for a in [i*math.pi/2.5 for i in range(5)])
    return f'<line x1="{x}" y1="{y}" x2="{x}" y2="{y+45}" stroke="#2e7d32" stroke-width="5"/>' + petals + f'<circle cx="{x}" cy="{y}" r="8" fill="#ffeb3b"/>'

def eye(x, y, r=10):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="#fff"/><circle cx="{x+2}" cy="{y+1}" r="{r*0.55:.1f}" fill="#2b2d42"/><circle cx="{x+4}" cy="{y-2}" r="{r*0.2:.1f}" fill="#fff"/>'

art = {}

art['animals-lion'] = svg(sun(500, 100) + cloud(150, 110) + '<path d="M0 380 Q150 340 300 370 T600 360 V600 H0Z" fill="#ffca6b"/><path d="M0 470 Q200 430 600 480 V600 H0Z" fill="#f4a73c"/>' + tree(90, 360, 0.9, '#7cb342') +
 '<g transform="translate(330 400)">'
 + ''.join(f'<ellipse cx="{math.cos(a)*85:.1f}" cy="{math.sin(a)*85-60:.1f}" rx="45" ry="30" transform="rotate({math.degrees(a):.0f} {math.cos(a)*85:.1f} {math.sin(a)*85-60:.1f})" fill="#d9822b"/>' for a in [i*math.pi/7 for i in range(14)])
 + '<ellipse cx="0" cy="120" rx="110" ry="70" fill="#f6b04c"/><circle cx="0" cy="-60" r="85" fill="#f6b04c"/>' + eye(-30, -80, 14) + eye(30, -80, 14) +
 '<ellipse cx="0" cy="-30" rx="40" ry="30" fill="#ffe0a3"/><path d="M-14 -45 L14 -45 L0 -28Z" fill="#6d4c41"/><path d="M-20 -15 Q0 5 20 -15" stroke="#6d4c41" stroke-width="5" fill="none"/><circle cx="-80" cy="-130" r="22" fill="#f6b04c"/><circle cx="80" cy="-130" r="22" fill="#f6b04c"/></g>' + flower(520, 470, '#ff5c7a') + flower(470, 500, '#7c5cff'))

art['animals-cat'] = svg(cloud(120, 90) + cloud(470, 140, 0.8) + '<rect y="380" width="600" height="220" fill="#81c784"/><path d="M0 380 h600" stroke="#66bb6a" stroke-width="12"/>' +
 ''.join(f'<rect x="{x}" y="300" width="36" height="110" rx="6" fill="#fff3e0" stroke="#d7ccc8" stroke-width="3"/>' for x in range(10, 600, 52)) + '<rect y="330" width="600" height="14" fill="#ffe0b2"/>' +
 '<g transform="translate(300 420)"><ellipse cx="0" cy="60" rx="120" ry="80" fill="#90a4ae"/><path d="M110 70 Q200 40 170 -40" stroke="#90a4ae" stroke-width="28" fill="none" stroke-linecap="round"/><circle cx="0" cy="-60" r="90" fill="#b0bec5"/><path d="M-80 -110 L-70 -190 L-20 -140Z M80 -110 L70 -190 L20 -140Z" fill="#b0bec5"/><path d="M-70 -125 L-65 -170 L-35 -140Z M70 -125 L65 -170 L35 -140Z" fill="#ffc1d6"/>'
 + eye(-35, -70, 18) + eye(35, -70, 18) + '<path d="M-10 -30 L10 -30 L0 -18Z" fill="#ff8fab"/><path d="M-22 -10 Q-10 4 0 -12 Q10 4 22 -10" stroke="#37474f" stroke-width="4" fill="none"/>'
 + ''.join(f'<line x1="{s*40}" y1="{-20+d}" x2="{s*110}" y2="{-30+d*2}" stroke="#37474f" stroke-width="3"/>' for s in (-1, 1) for d in (0, 14)) + '<rect x="-60" y="18" width="120" height="16" rx="8" fill="#ff5c7a"/><circle cx="0" cy="40" r="12" fill="#ffd54f"/></g>'
 + ''.join(flower(x, 480, c) for x, c in [(60, '#ff8a80'), (130, '#ffd54f'), (480, '#ba68c8'), (550, '#4fc3f7')]))

art['dinosaurs-trex'] = svg('<path d="M380 360 L470 150 L560 360Z" fill="#6d4c41"/><path d="M445 170 Q470 120 495 170 L480 200 L460 200Z" fill="#ff7043"/>' + ''.join(f'<circle cx="{470+dx}" cy="{110-dy}" r="{r}" fill="#9e9e9e" opacity=".8"/>' for dx, dy, r in [(0, 0, 22), (20, 30, 28), (-10, 65, 32)]) +
 '<path d="M0 400 Q300 350 600 400 V600 H0Z" fill="#8bc34a"/><path d="M0 500 Q300 460 600 520 V600 H0Z" fill="#689f38"/>' + tree(70, 380, 0.8, '#558b2f') +
 '<g transform="translate(250 380)"><path d="M-160 40 Q-60 10 -20 20" stroke="#4caf50" stroke-width="50" fill="none" stroke-linecap="round"/><ellipse cx="0" cy="20" rx="110" ry="80" fill="#4caf50"/><rect x="-60" y="70" width="40" height="90" rx="15" fill="#43a047"/><rect x="30" y="70" width="40" height="90" rx="15" fill="#43a047"/>'
 '<path d="M50 -40 Q70 -170 170 -150 Q230 -140 230 -90 Q230 -50 160 -50 Q110 -40 100 0Z" fill="#4caf50"/>' + eye(160, -115, 14) + '<path d="M170 -70 L180 -60 L190 -70 L200 -60 L210 -70" stroke="#fff" stroke-width="5" fill="none"/>'
 '<path d="M80 -10 q20 15 10 35" stroke="#43a047" stroke-width="12" stroke-linecap="round" fill="none"/>' + ''.join(f'<path d="M{x} {y} l12 -22 l12 22Z" fill="#ffca28"/>' for x, y in [(-70, -50), (-40, -58), (-10, -60), (20, -55), (60, -100), (75, -130)]) + '</g>')

art['dinosaurs-longneck'] = svg(sun(100, 100, 45) + cloud(420, 90) + '<rect y="380" width="600" height="220" fill="#4fc3f7"/><path d="M0 380 q50 -15 100 0 t100 0 t100 0 t100 0 t100 0 t100 0" stroke="#e1f5fe" stroke-width="6" fill="none"/>' +
 '<path d="M0 340 Q120 300 240 340 L240 600 H0Z" fill="#9ccc65"/>' + tree(70, 330, 0.7, '#7cb342') +
 '<g transform="translate(380 420)"><ellipse cx="0" cy="0" rx="140" ry="70" fill="#ab47bc"/><path d="M-130 10 Q-220 40 -240 -10" stroke="#ab47bc" stroke-width="30" fill="none" stroke-linecap="round"/><path d="M90 -30 Q140 -150 110 -250" stroke="#ab47bc" stroke-width="50" fill="none" stroke-linecap="round"/><ellipse cx="135" cy="-260" rx="55" ry="35" fill="#ab47bc"/>'
 + eye(145, -270, 11) + '<path d="M160 -245 Q175 -238 185 -248" stroke="#4a148c" stroke-width="4" fill="none"/>' + ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#ce93d8"/>' for x, y, r in [(-40, -20, 18), (10, -35, 14), (50, -10, 16), (-80, 10, 12)]) + '</g>'
 '<g fill="#fff" opacity=".7">' + ''.join(f'<ellipse cx="{x}" cy="{y}" rx="30" ry="6"/>' for x, y in [(300, 520), (470, 560), (560, 470)]) + '</g>')

art['cars-race'] = svg(cloud(120, 90) + cloud(480, 120, 0.9) + '<rect y="330" width="600" height="270" fill="#66bb6a"/><path d="M0 380 H600 V560 H0Z" fill="#616161"/>' + ''.join(f'<rect x="{x}" y="462" width="50" height="12" fill="#fff"/>' for x in range(10, 600, 90)) +
 ''.join(f'<rect x="{x}" y="355" width="30" height="25" fill="{"#e53935" if i % 2 else "#fff"}"/>' for i, x in enumerate(range(0, 600, 30))) + '<rect x="520" y="200" width="10" height="180" fill="#9e9e9e"/>' +
 ''.join(f'<rect x="{530+c*14}" y="{200+r*14}" width="14" height="14" fill="{"#222" if (r+c)%2 else "#fff"}"/>' for r in range(4) for c in range(5)) +
 '<g transform="translate(280 470)"><path d="M-170 20 L-150 -40 L-60 -50 L-20 -100 L80 -100 L120 -50 L190 -40 L200 20Z" fill="#e53935"/><path d="M-10 -90 L70 -90 L100 -52 L-40 -52Z" fill="#b3e5fc"/><rect x="-150" y="-10" width="340" height="12" fill="#ffeb3b"/>'
 '<text x="40" y="0" font-size="44" font-weight="900" fill="#fff" font-family="Arial">7</text>' + ''.join(f'<circle cx="{x}" cy="25" r="38" fill="#263238"/><circle cx="{x}" cy="25" r="16" fill="#cfd8dc"/>' for x in (-100, 130)) + '<rect x="185" y="-75" width="20" height="40" fill="#b71c1c"/></g>')

art['cars-bus'] = svg('<rect x="0" y="120" width="140" height="300" fill="#ffab91"/><rect x="150" y="60" width="130" height="360" fill="#90caf9"/><rect x="290" y="150" width="140" height="270" fill="#ce93d8"/><rect x="440" y="90" width="160" height="330" fill="#a5d6a7"/>' +
 ''.join(f'<rect x="{bx+15+c*40}" y="{by+20+r*55}" width="26" height="34" fill="#fffde7"/>' for bx, by, cols, rows in [(0, 120, 3, 5), (150, 60, 3, 6), (290, 150, 3, 4), (440, 90, 3, 5)] for c in range(cols) for r in range(rows)) +
 '<rect y="420" width="600" height="180" fill="#757575"/><rect y="420" width="600" height="18" fill="#bdbdbd"/>' + ''.join(f'<rect x="{x}" y="520" width="60" height="10" fill="#ffeb3b"/>' for x in range(0, 600, 110)) +
 '<g transform="translate(300 470)"><rect x="-220" y="-130" width="440" height="140" rx="26" fill="#ffc107"/><rect x="-200" y="-110" width="380" height="55" rx="10" fill="#b3e5fc"/>' + ''.join(f'<line x1="{x}" y1="-110" x2="{x}" y2="-55" stroke="#ffc107" stroke-width="8"/>' for x in (-105, -10, 85)) +
 '<rect x="185" y="-110" width="25" height="90" rx="6" fill="#81d4fa"/><rect x="-220" y="-30" width="440" height="12" fill="#ff9800"/><circle cx="205" cy="-15" r="9" fill="#fff59d"/>' + ''.join(f'<circle cx="{x}" cy="15" r="34" fill="#263238"/><circle cx="{x}" cy="15" r="13" fill="#cfd8dc"/>' for x in (-130, 130)) + '<text x="-60" y="-70" font-size="30" font-weight="900" fill="#e65100" font-family="Arial">SCHOOL</text></g>')

art['space-rocket'] = svg(''.join(f'<circle cx="{(i*97)%600}" cy="{(i*53)%600}" r="{1+i%3}" fill="#fff"/>' for i in range(60)) +
 '<circle cx="120" cy="140" r="70" fill="#ff8a65"/><ellipse cx="120" cy="140" rx="115" ry="20" fill="none" stroke="#ffe082" stroke-width="10" transform="rotate(-20 120 140)"/><circle cx="500" cy="480" r="110" fill="#4fc3f7"/><path d="M440 420 q30 -20 50 10 q20 30 -10 50 q-40 10 -40 -60Z M520 500 q40 -10 50 30 q-20 40 -50 20Z" fill="#81c784"/>' +
 '<g transform="translate(300 300) rotate(30)"><path d="M0 -170 Q70 -90 60 60 L-60 60 Q-70 -90 0 -170Z" fill="#eceff1"/><path d="M0 -170 Q35 -130 45 -100 L-45 -100 Q-35 -130 0 -170Z" fill="#e53935"/><circle cx="0" cy="-40" r="28" fill="#4fc3f7" stroke="#90a4ae" stroke-width="8"/>'
 '<path d="M-60 0 L-110 80 L-60 60Z M60 0 L110 80 L60 60Z" fill="#e53935"/><path d="M-35 60 Q0 160 35 60Z" fill="#ffca28"/><path d="M-20 60 Q0 120 20 60Z" fill="#ff7043"/></g>', sky=('#1a1446', '#3d2c8d'))

art['space-astronaut'] = svg(''.join(f'<circle cx="{(i*71)%600}" cy="{(i*37)%400}" r="{1+i%2}" fill="#fff"/>' for i in range(50)) + '<circle cx="480" cy="110" r="60" fill="#81c784"/><circle cx="460" cy="95" r="15" fill="#66bb6a"/>' +
 '<path d="M0 430 Q300 380 600 440 V600 H0Z" fill="#cfd8dc"/>' + ''.join(f'<ellipse cx="{x}" cy="{y}" rx="{r}" ry="{r*0.4}" fill="#b0bec5"/>' for x, y, r in [(90, 500, 40), (300, 540, 55), (500, 500, 35), (200, 460, 22)]) +
 '<rect x="420" y="300" width="6" height="140" fill="#9e9e9e"/><path d="M426 300 h90 v55 h-90Z" fill="#ff5c7a"/><path d="M426 318 h90 M426 336 h90" stroke="#fff" stroke-width="6"/>' +
 '<g transform="translate(230 350)"><rect x="-60" y="-10" width="120" height="130" rx="40" fill="#fafafa"/><rect x="-85" y="0" width="30" height="90" rx="15" fill="#fafafa" transform="rotate(20 -70 0)"/><rect x="55" y="0" width="30" height="90" rx="15" fill="#fafafa" transform="rotate(-40 70 0)"/>'
 '<circle cx="0" cy="-60" r="70" fill="#fafafa"/><circle cx="0" cy="-60" r="52" fill="#3949ab"/><path d="M-30 -85 q15 -10 30 0" stroke="#9fa8da" stroke-width="8" fill="none" stroke-linecap="round"/><rect x="-25" y="30" width="50" height="35" rx="8" fill="#90a4ae"/><circle cx="-10" cy="47" r="6" fill="#ff5c7a"/><circle cx="10" cy="47" r="6" fill="#4fc3f7"/></g>', sky=('#0d1b3e', '#283593'))

art['castles-castle'] = svg(sun(510, 90, 40) + cloud(120, 100) + '<path d="M0 420 Q300 300 600 420 V600 H0Z" fill="#81c784"/><path d="M200 600 Q280 480 300 420 Q320 480 400 600Z" fill="#d7ccc8"/>' +
 '<g transform="translate(300 300)"><rect x="-150" y="-60" width="300" height="140" fill="#bdbdbd"/>' + ''.join(f'<rect x="{x}" y="-80" width="30" height="24" fill="#bdbdbd"/>' for x in range(-150, 150, 50)) +
 ''.join(f'<rect x="{x}" y="-150" width="70" height="230" fill="#9e9e9e"/><path d="M{x-10} -150 L{x+35} -230 L{x+80} -150Z" fill="#7c5cff"/><rect x="{x+25}" y="-110" width="20" height="30" rx="10" fill="#ffe082"/>' for x in (-185, 115)) +
 '<rect x="-45" y="-150" width="90" height="230" fill="#a1a1a1"/><path d="M-55 -150 L0 -250 L55 -150Z" fill="#ff5c7a"/><line x1="0" y1="-250" x2="0" y2="-290" stroke="#5d4037" stroke-width="5"/><path d="M0 -290 l40 12 l-40 12Z" fill="#ffca28"/>'
 '<path d="M-35 80 V20 Q0 -20 35 20 V80Z" fill="#6d4c41"/><circle cx="0" cy="-90" r="18" fill="#ffe082"/></g>')

art['castles-dragon'] = svg(cloud(100, 110) + cloud(430, 70, 0.7) + '<path d="M0 450 L120 330 L240 450Z" fill="#78909c"/><path d="M180 450 L330 280 L480 450Z" fill="#607d8b"/><rect y="440" width="600" height="160" fill="#8bc34a"/>' +
 '<rect x="470" y="200" width="80" height="250" fill="#bcaaa4"/><path d="M455 200 L510 110 L565 200Z" fill="#e53935"/><rect x="495" y="250" width="30" height="40" rx="15" fill="#ffe082"/>' +
 '<g transform="translate(230 320)"><path d="M-40 -20 L-160 -120 L-100 -10 L-170 -40 L-90 30Z" fill="#26a69a"/><path d="M40 -20 L150 -140 L110 -20 L180 -50 L90 30Z" fill="#26a69a"/><ellipse cx="0" cy="40" rx="90" ry="70" fill="#66bb6a"/><ellipse cx="0" cy="60" rx="55" ry="45" fill="#fff59d"/>'
 '<circle cx="0" cy="-60" r="60" fill="#66bb6a"/><path d="M-35 -110 L-25 -140 L-10 -112Z M35 -110 L25 -140 L10 -112Z" fill="#ffca28"/>' + eye(-22, -70, 13) + eye(22, -70, 13) + '<ellipse cx="0" cy="-30" rx="30" ry="18" fill="#81c784"/><circle cx="-10" cy="-32" r="4" fill="#2e7d32"/><circle cx="10" cy="-32" r="4" fill="#2e7d32"/><path d="M-20 -15 Q0 0 20 -15" stroke="#2e7d32" stroke-width="4" fill="none"/>'
 '<path d="M80 80 Q160 110 190 50 L200 70" stroke="#66bb6a" stroke-width="22" fill="none" stroke-linecap="round"/><circle cx="-50" cy="120" r="22" fill="#66bb6a"/><circle cx="50" cy="120" r="22" fill="#66bb6a"/></g>' + ''.join(flower(x, 500, c) for x, c in [(60, '#ff8a80'), (400, '#ffd54f'), (550, '#ba68c8')]))

art['nature-mountains'] = svg(sun(300, 300, 70, '#ff9800') + '<path d="M0 380 L140 170 L260 330 L380 150 L600 400 V600 H0Z" fill="#5c6bc0"/><path d="M110 215 L140 170 L170 215 L150 205 L140 220Z M350 195 L380 150 L415 200 L395 190 L380 205Z" fill="#fff"/>' +
 '<path d="M0 420 Q300 360 600 430 V600 H0Z" fill="#43a047"/><path d="M0 470 Q300 430 600 480 V600 H0Z" fill="#29b6f6"/><path d="M60 510 h80 M260 540 h120 M450 500 h90" stroke="#e1f5fe" stroke-width="6" stroke-linecap="round"/>' + tree(70, 420, 0.6, '#2e7d32') + tree(540, 430, 0.7, '#2e7d32') +
 '<g fill="#5d4037"><path d="M200 120 q15 -15 30 0 q15 -15 30 0" stroke="#5d4037" stroke-width="5" fill="none"/><path d="M420 90 q12 -12 24 0 q12 -12 24 0" stroke="#5d4037" stroke-width="5" fill="none"/></g>', sky=('#ff8a65', '#ffe0b2'))

art['nature-rainbow'] = svg(''.join(f'<path d="M{40+i*22} 420 A {260-i*22} {260-i*22} 0 0 1 {560-i*22} 420" stroke="{c}" stroke-width="22" fill="none"/>' for i, c in enumerate(['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'])) + cloud(70, 410, 0.9) + cloud(540, 410, 0.9) +
 '<rect y="420" width="600" height="180" fill="#9ccc65"/>' + ''.join(flower(x, y, c) for x, y, c in [(40, 470, '#ff8a80'), (110, 520, '#ffd54f'), (180, 465, '#ba68c8'), (250, 530, '#4fc3f7'), (330, 475, '#ff5c7a'), (400, 520, '#ffb74d'), (470, 470, '#9575cd'), (550, 525, '#f06292')]) +
 '<g transform="translate(300 250)"><ellipse cx="-30" cy="0" rx="35" ry="25" fill="#ff8fab" transform="rotate(-30 -30 0)"/><ellipse cx="30" cy="0" rx="35" ry="25" fill="#ff8fab" transform="rotate(30 30 0)"/><ellipse cx="-22" cy="30" rx="22" ry="16" fill="#ce93d8"/><ellipse cx="22" cy="30" rx="22" ry="16" fill="#ce93d8"/><rect x="-6" y="-25" width="12" height="70" rx="6" fill="#5d4037"/><path d="M-3 -25 q-10 -20 -18 -22 M3 -25 q10 -20 18 -22" stroke="#5d4037" stroke-width="3" fill="none"/></g>', sky=('#81d4fa', '#e1f5fe'))

for name, content in art.items():
    with open(os.path.join(OUT, name + '.svg'), 'w') as f:
        f.write(content)
print(len(art), 'puzzle images written')
