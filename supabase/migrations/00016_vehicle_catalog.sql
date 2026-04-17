-- ── TABLAS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vehicle_brands (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.vehicle_models (
  id       SERIAL PRIMARY KEY,
  brand_id INTEGER NOT NULL REFERENCES public.vehicle_brands(id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  UNIQUE(brand_id, name)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_models_brand ON public.vehicle_models(brand_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.vehicle_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_models ENABLE ROW LEVEL SECURITY;

-- Lectura pública (necesario para los desplegables en formularios de clientes/concesionarios)
CREATE POLICY "vehicle_brands_select" ON public.vehicle_brands FOR SELECT USING (true);
CREATE POLICY "vehicle_models_select" ON public.vehicle_models FOR SELECT USING (true);

-- ── MARCAS ────────────────────────────────────────────────────────────────────
INSERT INTO public.vehicle_brands (name) VALUES
  ('Honda'), ('Yamaha'), ('Kawasaki'), ('Suzuki'), ('BMW Motorrad'),
  ('Ducati'), ('KTM'), ('Triumph'), ('Harley-Davidson'), ('Aprilia'),
  ('Benelli'), ('Royal Enfield'), ('Husqvarna'), ('MV Agusta'), ('Indian'),
  ('Moto Guzzi'), ('CFMOTO'), ('Kymco'), ('SYM'), ('Vespa'),
  ('Piaggio'), ('Can-Am'), ('Beta'), ('Gas Gas'), ('TM Racing'),
  ('Sherco'), ('Rieju'), ('Peugeot Motocycles'), ('Zero Motorcycles'), ('Energica')
ON CONFLICT (name) DO NOTHING;

-- ── MODELOS ───────────────────────────────────────────────────────────────────

-- Honda
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('CB125R'), ('CB300R'), ('CB500F'), ('CB500X'), ('CB650R'),
  ('CB750 Hornet'), ('CB1000R'),
  ('CBR600RR'), ('CBR650R'), ('CBR1000RR Fireblade'),
  ('CMX500 Rebel'), ('CMX1100 Rebel'),
  ('CRF300L'), ('CRF300 Rally'), ('CRF1100L Africa Twin'),
  ('Forza 125'), ('Forza 350'), ('PCX125'), ('SH125'), ('SH350'),
  ('X-ADV 750'), ('NC750X'), ('NC750S'), ('GL1800 Gold Wing'),
  ('MSX125 Grom'), ('Monkey 125'), ('Dax 125')
) AS m(name) WHERE b.name = 'Honda'
ON CONFLICT DO NOTHING;

-- Yamaha
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('MT-03'), ('MT-07'), ('MT-09'), ('MT-10'),
  ('YZF-R3'), ('YZF-R7'), ('YZF-R1'),
  ('Tracer 7'), ('Tracer 9'), ('Tracer 9 GT'),
  ('Ténéré 700'), ('Ténéré 700 World Raid'), ('Super Ténéré 1200'),
  ('XMAX 125'), ('XMAX 300'), ('XMAX 400'), ('TMAX 560'),
  ('NMAX 125'), ('Aerox 155'),
  ('XSR700'), ('XSR900'),
  ('FZ6'), ('FZ1'), ('Dragstar 650'), ('V-Max 1700')
) AS m(name) WHERE b.name = 'Yamaha'
ON CONFLICT DO NOTHING;

-- Kawasaki
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('Z400'), ('Z650'), ('Z650RS'), ('Z900'), ('Z900RS'), ('Z1000'), ('Z H2'),
  ('Ninja 400'), ('Ninja 650'), ('Ninja ZX-6R'), ('Ninja ZX-10R'),
  ('Ninja ZX-10RR'), ('Ninja H2'), ('Ninja H2 Carbon'),
  ('Versys 650'), ('Versys 1000'), ('Versys-X 300'),
  ('Vulcan S'), ('Vulcan 900'), ('W800'),
  ('KLX300'), ('KX450'), ('ER-6n')
) AS m(name) WHERE b.name = 'Kawasaki'
ON CONFLICT DO NOTHING;

-- Suzuki
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('GSX-S750'), ('GSX-S1000'), ('GSX-S1000GT'), ('GSX-S1000GX'),
  ('GSX-R750'), ('GSX-R1000'),
  ('V-Strom 650'), ('V-Strom 650 XT'), ('V-Strom 1050'), ('V-Strom 1050 XT'),
  ('SV650'), ('SV650 Sport'), ('Hayabusa'),
  ('Burgman 125'), ('Burgman 200'), ('Burgman 400'), ('Burgman 650'),
  ('Bandit 1250'), ('Boulevard M109R'), ('DR650'),
  ('Inazuma 250'), ('Gixxer 250')
) AS m(name) WHERE b.name = 'Suzuki'
ON CONFLICT DO NOTHING;

-- BMW Motorrad
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('R 1250 GS'), ('R 1250 GS Adventure'), ('R 1250 RT'), ('R 1250 R'), ('R 1250 RS'),
  ('S 1000 RR'), ('S 1000 R'), ('S 1000 XR'), ('M 1000 RR'), ('M 1000 R'),
  ('F 750 GS'), ('F 850 GS'), ('F 850 GS Adventure'), ('F 900 R'), ('F 900 XR'),
  ('G 310 R'), ('G 310 GS'), ('G 310 RR'),
  ('C 400 X'), ('C 400 GT'),
  ('R nineT'), ('R nineT Scrambler'), ('R nineT Pure'),
  ('K 1600 GT'), ('K 1600 GTL'), ('K 1600 B')
) AS m(name) WHERE b.name = 'BMW Motorrad'
ON CONFLICT DO NOTHING;

-- Ducati
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('Monster'), ('Monster SP'), ('Monster Plus'),
  ('Scrambler 800'), ('Scrambler 1100'), ('Scrambler 1100 Sport Pro'),
  ('Diavel V4'), ('XDiavel'),
  ('Multistrada V4'), ('Multistrada V4 S'), ('Multistrada V4 Pikes Peak'),
  ('Panigale V4'), ('Panigale V4 S'), ('Panigale V4 R'), ('Panigale V4 SP2'),
  ('Panigale V2'),
  ('Hypermotard 950'), ('Hypermotard 950 SP'),
  ('SuperSport 950'), ('SuperSport 950 S'),
  ('DesertX'), ('DesertX Rally'),
  ('Streetfighter V4'), ('Streetfighter V4 S'), ('Streetfighter V2')
) AS m(name) WHERE b.name = 'Ducati'
ON CONFLICT DO NOTHING;

-- KTM
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('125 Duke'), ('390 Duke'), ('790 Duke'), ('890 Duke'), ('890 Duke R'),
  ('1290 Super Duke R'), ('1290 Super Duke GT'),
  ('390 Adventure'), ('790 Adventure'), ('890 Adventure'), ('890 Adventure R'),
  ('1090 Adventure'), ('1290 Super Adventure S'), ('1290 Super Adventure R'),
  ('RC 390'), ('RC 125'),
  ('450 SMC R'), ('690 SMC R'), ('690 Duke'),
  ('Freeride 250'), ('300 EXC TPI'), ('450 EXC-F'),
  ('125 EXC TPI')
) AS m(name) WHERE b.name = 'KTM'
ON CONFLICT DO NOTHING;

-- Triumph
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('Street Triple R'), ('Street Triple RS'), ('Street Triple S'),
  ('Trident 660'), ('Tiger Sport 660'),
  ('Tiger 660'), ('Tiger 900'), ('Tiger 900 GT Pro'), ('Tiger 900 Rally Pro'),
  ('Tiger 1200 GT'), ('Tiger 1200 GT Explorer'), ('Tiger 1200 Rally Pro'),
  ('Bonneville T100'), ('Bonneville T120'), ('Bonneville T120 Black'),
  ('Scrambler 400 X'), ('Scrambler 1200 XC'), ('Scrambler 1200 XE'),
  ('Speed Triple 1200 RS'), ('Speed Triple 1200 RR'),
  ('Speed Twin 900'), ('Speed Twin 1200'),
  ('Rocket 3 R'), ('Rocket 3 GT'),
  ('Thruxton RS'), ('Speedmaster')
) AS m(name) WHERE b.name = 'Triumph'
ON CONFLICT DO NOTHING;

-- Harley-Davidson
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('Sportster S'), ('Nightster'), ('Nightster Special'),
  ('Iron 883'), ('Iron 1200'), ('Forty-Eight'),
  ('Road King'), ('Road King Special'),
  ('Road Glide'), ('Road Glide Special'), ('Road Glide Ultra'),
  ('Street Glide'), ('Street Glide Special'),
  ('Fat Boy'), ('Fat Bob'),
  ('Softail Standard'), ('Softail Slim'),
  ('Low Rider'), ('Low Rider S'), ('Low Rider ST'),
  ('Pan America 1250'), ('Pan America 1250 Special'),
  ('Heritage Classic'), ('Electra Glide Ultra Classic'),
  ('Street Bob'), ('CVO Road Glide')
) AS m(name) WHERE b.name = 'Harley-Davidson'
ON CONFLICT DO NOTHING;

-- Aprilia
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('RS 660'), ('RS 660 Extrema'), ('Tuono 660'), ('Tuono 660 Factory'),
  ('Tuono V4'), ('Tuono V4 Factory'),
  ('RSV4'), ('RSV4 Factory'), ('RSV4 RR'),
  ('Shiver 900'), ('Dorsoduro 900'),
  ('SR GT 125'), ('SR GT 200'), ('SR GT Sport'),
  ('SR 50'), ('SR 50 R'), ('SR Motard'),
  ('Mana 850'), ('Caponord 1200')
) AS m(name) WHERE b.name = 'Aprilia'
ON CONFLICT DO NOTHING;

-- Benelli
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('BN 302'), ('BN 302 S'), ('BN 302 R'),
  ('TNT 300'), ('TNT 600'), ('TNT 899'), ('TNT 1130'),
  ('TRK 502'), ('TRK 502 X'), ('TRK 702'), ('TRK 702 X'), ('TRK 800'),
  ('Leoncino 250'), ('Leoncino 500'), ('Leoncino 500 Trail'),
  ('502C'), ('Imperiale 400'), ('Zafferano 900')
) AS m(name) WHERE b.name = 'Benelli'
ON CONFLICT DO NOTHING;

-- Royal Enfield
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('Classic 350'), ('Bullet 350'), ('Hunter 350'),
  ('Meteor 350'), ('Meteor 350 Fireball'),
  ('Thunderbird 350X'),
  ('Himalayan'), ('Himalayan 450'),
  ('Interceptor 650'), ('Continental GT 650'),
  ('Scram 411'), ('Super Meteor 650'),
  ('Shotgun 650')
) AS m(name) WHERE b.name = 'Royal Enfield'
ON CONFLICT DO NOTHING;

-- Husqvarna
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('Vitpilen 125'), ('Vitpilen 401'), ('Vitpilen 701'),
  ('Svartpilen 125'), ('Svartpilen 401'), ('Svartpilen 701'),
  ('Norden 901'), ('Norden 901 Expedition'),
  ('TE 150i'), ('TE 250i'), ('TE 300i'),
  ('FE 250'), ('FE 350'), ('FE 450'), ('FE 501'),
  ('Enduro 701'), ('Supermoto 701')
) AS m(name) WHERE b.name = 'Husqvarna'
ON CONFLICT DO NOTHING;

-- MV Agusta
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('Brutale 800'), ('Brutale 800 RR'), ('Brutale 1000 RR'), ('Brutale 1000 RS'),
  ('F3 675'), ('F3 800'), ('F4'), ('F4 RR'),
  ('Turismo Veloce 800'), ('Turismo Veloce 800 Lusso'),
  ('Dragster 800'), ('Dragster 800 RR'), ('Dragster 800 Rosso'),
  ('Rush 1000'), ('Superveloce 800'),
  ('Lucky Explorer 9.5'), ('Lucky Explorer 5.5')
) AS m(name) WHERE b.name = 'MV Agusta'
ON CONFLICT DO NOTHING;

-- Indian
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('Scout'), ('Scout Bobber'), ('Scout Rogue'), ('Scout Bobber Twenty'),
  ('Chief'), ('Chief Dark Horse'), ('Chief Bobber'), ('Chief Bobber Dark Horse'),
  ('Chieftain'), ('Chieftain Dark Horse'), ('Chieftain Limited'),
  ('Roadmaster'), ('Roadmaster Dark Horse'), ('Roadmaster Limited'),
  ('FTR 1200'), ('FTR 1200 S'), ('FTR Rally'), ('FTR R Carbon'),
  ('Pursuit Dark Horse'), ('Pursuit Limited'),
  ('Super Chief'), ('Super Chief Limited')
) AS m(name) WHERE b.name = 'Indian'
ON CONFLICT DO NOTHING;

-- Moto Guzzi
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('V7 Stone'), ('V7 Special'), ('V7 Stone Centenario'),
  ('V9 Bobber'), ('V9 Roamer'), ('V9 Bobber Sport'),
  ('V85 TT'), ('V85 TT Travel'), ('V85 TT Adventure'),
  ('California 1400'), ('California 1400 Touring'), ('California 1400 Custom'),
  ('Eldorado'), ('MGX-21'), ('V100 Mandello'), ('V100 Mandello S')
) AS m(name) WHERE b.name = 'Moto Guzzi'
ON CONFLICT DO NOTHING;

-- CFMOTO
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('300NK'), ('400NK'), ('650NK'), ('700CL-X'), ('700CL-X Sport'), ('700CL-X Heritage'),
  ('800MT'), ('800MT Sport'), ('800MT Touring'),
  ('650MT'), ('650GT'), ('450SR'), ('300SS'), ('450NK'),
  ('CLX 700'), ('CF Moto 125NK')
) AS m(name) WHERE b.name = 'CFMOTO'
ON CONFLICT DO NOTHING;

-- Kymco
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('AK 550'), ('AK 450'),
  ('Downtown 350i'), ('Downtown 125i'),
  ('Xciting S 400'), ('Xciting 400i'),
  ('People S 300'), ('People S 125'), ('People GT 300i'),
  ('Agility 125'), ('Agility 50'),
  ('Super 8 125'), ('Super 8 50'),
  ('X-Town 300'), ('X-Town 125'),
  ('Maxxer 400'), ('MXU 150')
) AS m(name) WHERE b.name = 'Kymco'
ON CONFLICT DO NOTHING;

-- SYM
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('Joymax Z 300'), ('Joymax Z 125'),
  ('Cruisym 300'), ('Cruisym 125'),
  ('Jet 14 125'), ('Jet 14 50'),
  ('Maxsym 400'), ('Maxsym TL 500'), ('Maxsym TL 508'),
  ('Symphony S 125'), ('Symphony SR 125'),
  ('ADX 300'), ('CRUISiM 300'),
  ('Wolf 125'), ('T2 125')
) AS m(name) WHERE b.name = 'SYM'
ON CONFLICT DO NOTHING;

-- Vespa
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('GTS 125'), ('GTS 125 Super'), ('GTS 300'), ('GTS 300 Super'), ('GTS 300 Super Sport'),
  ('GT 125'), ('GT 200'),
  ('LX 125'), ('LX 50'),
  ('Sprint 125'), ('Sprint 150'), ('Sprint S 125'),
  ('Primavera 125'), ('Primavera 50'), ('Primavera S 125'), ('Primavera 150'),
  ('946'), ('946 Dragon'),
  ('Elettrica'), ('Elettrica L')
) AS m(name) WHERE b.name = 'Vespa'
ON CONFLICT DO NOTHING;

-- Piaggio
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('MP3 300 HPE'), ('MP3 400 HPE'), ('MP3 530 HPE'),
  ('Beverly 300 HPE'), ('Beverly 400 HPE'), ('Beverly 500'),
  ('Medley 150'), ('Medley S 150'),
  ('Liberty 125'), ('Liberty S 125'), ('Liberty 50'),
  ('Fly 125'), ('Fly 50'),
  ('X10 125'), ('X10 350'), ('X10 500'),
  ('Typhoon 125'), ('Typhoon 50')
) AS m(name) WHERE b.name = 'Piaggio'
ON CONFLICT DO NOTHING;

-- Can-Am
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('Ryker 600'), ('Ryker 900'), ('Ryker 900 Sport'), ('Ryker Rally Edition'),
  ('Spyder F3'), ('Spyder F3-S'), ('Spyder F3-T'), ('Spyder F3 Limited'),
  ('Spyder RT'), ('Spyder RT Limited'), ('Spyder RT Sea-to-Sky')
) AS m(name) WHERE b.name = 'Can-Am'
ON CONFLICT DO NOTHING;

-- Beta
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('RR 2T 125'), ('RR 2T 200'), ('RR 2T 250'), ('RR 2T 300'),
  ('RR 4T 350'), ('RR 4T 390'), ('RR 4T 430'), ('RR 4T 450'), ('RR 4T 480'),
  ('X-Trainer 250'), ('X-Trainer 300'),
  ('RR-S 350'), ('RR-S 430'), ('RR-S 480'),
  ('RR Enduro 125'), ('Evo Factory 300')
) AS m(name) WHERE b.name = 'Beta'
ON CONFLICT DO NOTHING;

-- Gas Gas
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('EC 250'), ('EC 300'), ('EC 250F'), ('EC 350F'), ('EC 450F'),
  ('MC 65'), ('MC 85'), ('MC 125'), ('MC 250'), ('MC 250F'), ('MC 450F'),
  ('Enduro EC 200'), ('EX 300'), ('EX 450F'),
  ('SM 700'), ('ES 700'),
  ('TXT Racing 250'), ('TXT Racing 280'), ('TXT Racing 300'), ('TXT GP 250')
) AS m(name) WHERE b.name = 'Gas Gas'
ON CONFLICT DO NOTHING;

-- TM Racing
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('EN 125 2T'), ('EN 144 2T'), ('EN 250 2T'), ('EN 300 2T'),
  ('EN 250 Fi 4T'), ('EN 450 Fi 4T'),
  ('MX 125'), ('MX 144'), ('MX 250'), ('MX 250 Fi'),
  ('SMX 450 Fi'), ('SMX 530 Fi'),
  ('SMR 125'), ('SMR 300')
) AS m(name) WHERE b.name = 'TM Racing'
ON CONFLICT DO NOTHING;

-- Sherco
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('SE-R 125'), ('SE-R 250'), ('SE-R 300'), ('SE-R 450'),
  ('SEF-R 250'), ('SEF-R 300'), ('SEF-R 450'),
  ('Factory 300 SC'), ('300 SCF'), ('300 SC Factory'),
  ('X-Ride 125'), ('X-Ride 290')
) AS m(name) WHERE b.name = 'Sherco'
ON CONFLICT DO NOTHING;

-- Rieju
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('MRT 50'), ('MRT 125'), ('MRT Pro 125'),
  ('Tango 50'), ('Tango Sport 50'),
  ('RS3 50'), ('RS3 Racing 50'),
  ('Century 125'), ('Century Sport 125'),
  ('MR 300 Racing'), ('MR Racing 125')
) AS m(name) WHERE b.name = 'Rieju'
ON CONFLICT DO NOTHING;

-- Peugeot Motocycles
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('Django 125'), ('Django 150'), ('Django Sport 125'),
  ('Streetzone 50'), ('Streetzone 50 Sport'),
  ('Speedfight 4 50'), ('Speedfight 4 125'),
  ('Tweet 125'), ('Tweet 150'),
  ('Kisbee 50'), ('Kisbee 100'),
  ('Metropolis 400'), ('Metropolis 400 RS'), ('e-Ludix')
) AS m(name) WHERE b.name = 'Peugeot Motocycles'
ON CONFLICT DO NOTHING;

-- Zero Motorcycles
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('Zero S'), ('Zero S ZF14.4'), ('Zero SR'), ('Zero SR ZF14.4'),
  ('Zero DS'), ('Zero DS ZF14.4'), ('Zero DSR'), ('Zero DSR ZF14.4'),
  ('Zero DSR/X'),
  ('Zero FX'), ('Zero FXE'), ('Zero FXS'),
  ('Zero SR/F'), ('Zero SR/S')
) AS m(name) WHERE b.name = 'Zero Motorcycles'
ON CONFLICT DO NOTHING;

-- Energica
INSERT INTO public.vehicle_models (brand_id, name)
SELECT b.id, m.name FROM public.vehicle_brands b
CROSS JOIN (VALUES
  ('Ego'), ('Ego+'), ('Ego+ RS'),
  ('Eva'), ('Eva Ribelle'), ('Eva Ribelle RS'),
  ('Experia'), ('Experia GT')
) AS m(name) WHERE b.name = 'Energica'
ON CONFLICT DO NOTHING;
