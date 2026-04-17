-- Cambiar el UNIQUE de vehicle_brands de solo (name) a (name, vehicle_type)
-- para permitir que la misma marca exista en motos y en coches
ALTER TABLE public.vehicle_brands
  DROP CONSTRAINT IF EXISTS vehicle_brands_name_key;

ALTER TABLE public.vehicle_brands
  ADD CONSTRAINT vehicle_brands_name_vehicle_type_key
  UNIQUE (name, vehicle_type);

-- Catálogo de coches: 30 marcas más comunes con sus modelos
-- vehicle_type = 'coches' en todas las inserciones

DO $$
DECLARE
  b_id INTEGER;
BEGIN

  -- 1. Toyota
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Toyota', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'Aygo X'),(b_id,'Yaris'),(b_id,'Yaris Cross'),(b_id,'Corolla'),(b_id,'Corolla Cross'),
    (b_id,'Camry'),(b_id,'C-HR'),(b_id,'RAV4'),(b_id,'Highlander'),(b_id,'Land Cruiser'),
    (b_id,'Land Cruiser Prado'),(b_id,'Hilux'),(b_id,'Proace'),(b_id,'Proace City'),(b_id,'GR86'),
    (b_id,'GR Yaris'),(b_id,'Supra'),(b_id,'bZ4X'),(b_id,'Prius');

  -- 2. Volkswagen
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Volkswagen', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'Up'),(b_id,'Polo'),(b_id,'Golf'),(b_id,'Golf Variant'),(b_id,'Golf Sportsvan'),
    (b_id,'Passat'),(b_id,'Passat Variant'),(b_id,'Arteon'),(b_id,'T-Cross'),(b_id,'T-Roc'),
    (b_id,'Tiguan'),(b_id,'Tiguan Allspace'),(b_id,'Touareg'),(b_id,'ID.3'),(b_id,'ID.4'),
    (b_id,'ID.5'),(b_id,'ID.7'),(b_id,'Caddy'),(b_id,'Transporter'),(b_id,'Multivan'),
    (b_id,'Sharan'),(b_id,'Touran');

  -- 3. SEAT
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('SEAT', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'Mii'),(b_id,'Ibiza'),(b_id,'León'),(b_id,'León Sportstourer'),(b_id,'Arona'),
    (b_id,'Ateca'),(b_id,'Tarraco'),(b_id,'Toledo'),(b_id,'Alhambra');

  -- 4. Renault
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Renault', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'Twingo'),(b_id,'Clio'),(b_id,'Clio E-Tech'),(b_id,'Zoe'),(b_id,'Mégane'),
    (b_id,'Mégane E-Tech'),(b_id,'Austral'),(b_id,'Talisman'),(b_id,'Captur'),(b_id,'Kadjar'),
    (b_id,'Koleos'),(b_id,'Arkana'),(b_id,'Scenic E-Tech'),(b_id,'Espace'),(b_id,'Kangoo'),
    (b_id,'Express'),(b_id,'Trafic'),(b_id,'Master');

  -- 5. Ford
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Ford', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'Fiesta'),(b_id,'Focus'),(b_id,'Focus Active'),(b_id,'Mondeo'),(b_id,'Mustang'),
    (b_id,'Mustang Mach-E'),(b_id,'Puma'),(b_id,'Kuga'),(b_id,'EcoSport'),(b_id,'Explorer'),
    (b_id,'S-Max'),(b_id,'Galaxy'),(b_id,'Ranger'),(b_id,'Transit'),(b_id,'Transit Custom'),
    (b_id,'Transit Connect'),(b_id,'Tourneo Custom'),(b_id,'Tourneo Connect');

  -- 6. Opel
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Opel', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'Corsa'),(b_id,'Corsa-e'),(b_id,'Astra'),(b_id,'Astra Sports Tourer'),(b_id,'Insignia'),
    (b_id,'Insignia Sports Tourer'),(b_id,'Mokka'),(b_id,'Mokka-e'),(b_id,'Crossland'),(b_id,'Grandland'),
    (b_id,'Grandland X'),(b_id,'Combo'),(b_id,'Zafira Life'),(b_id,'Vivaro'),(b_id,'Movano');

  -- 7. Peugeot
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Peugeot', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'108'),(b_id,'208'),(b_id,'e-208'),(b_id,'308'),(b_id,'308 SW'),(b_id,'408'),
    (b_id,'508'),(b_id,'508 SW'),(b_id,'2008'),(b_id,'e-2008'),(b_id,'3008'),(b_id,'5008'),
    (b_id,'Partner'),(b_id,'Rifter'),(b_id,'Traveller'),(b_id,'Expert'),(b_id,'Boxer');

  -- 8. Citroën
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Citroën', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'C1'),(b_id,'C3'),(b_id,'ë-C3'),(b_id,'C3 Aircross'),(b_id,'C4'),(b_id,'ë-C4'),
    (b_id,'C4 X'),(b_id,'C5 Aircross'),(b_id,'C5 X'),(b_id,'Berlingo'),(b_id,'ë-Berlingo'),
    (b_id,'SpaceTourer'),(b_id,'Jumpy'),(b_id,'Jumper');

  -- 9. BMW
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('BMW', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'Serie 1'),(b_id,'Serie 2'),(b_id,'Serie 2 Gran Coupé'),(b_id,'Serie 2 Active Tourer'),
    (b_id,'Serie 3'),(b_id,'Serie 3 Touring'),(b_id,'Serie 4'),(b_id,'Serie 4 Gran Coupé'),
    (b_id,'Serie 5'),(b_id,'Serie 5 Touring'),(b_id,'Serie 7'),(b_id,'Serie 8'),
    (b_id,'X1'),(b_id,'X2'),(b_id,'X3'),(b_id,'X4'),(b_id,'X5'),(b_id,'X6'),(b_id,'X7'),
    (b_id,'Z4'),(b_id,'i3'),(b_id,'i4'),(b_id,'i5'),(b_id,'i7'),(b_id,'iX'),(b_id,'iX1'),(b_id,'iX3');

  -- 10. Mercedes-Benz
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Mercedes-Benz', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'Clase A'),(b_id,'Clase A Sedan'),(b_id,'Clase B'),(b_id,'Clase C'),(b_id,'Clase C Estate'),
    (b_id,'Clase E'),(b_id,'Clase E Estate'),(b_id,'Clase S'),(b_id,'Clase G'),
    (b_id,'GLA'),(b_id,'GLB'),(b_id,'GLC'),(b_id,'GLC Coupé'),(b_id,'GLE'),(b_id,'GLE Coupé'),
    (b_id,'GLS'),(b_id,'CLA'),(b_id,'CLA Shooting Brake'),(b_id,'CLS'),
    (b_id,'EQA'),(b_id,'EQB'),(b_id,'EQC'),(b_id,'EQE'),(b_id,'EQS'),
    (b_id,'Vito'),(b_id,'Viano'),(b_id,'Sprinter');

  -- 11. Audi
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Audi', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'A1'),(b_id,'A1 Sportback'),(b_id,'A3'),(b_id,'A3 Sportback'),(b_id,'A3 Sedan'),
    (b_id,'A4'),(b_id,'A4 Avant'),(b_id,'A4 Allroad'),(b_id,'A5'),(b_id,'A5 Sportback'),
    (b_id,'A6'),(b_id,'A6 Avant'),(b_id,'A6 Allroad'),(b_id,'A7'),(b_id,'A8'),
    (b_id,'Q2'),(b_id,'Q3'),(b_id,'Q3 Sportback'),(b_id,'Q5'),(b_id,'Q5 Sportback'),
    (b_id,'Q7'),(b_id,'Q8'),(b_id,'Q8 e-tron'),(b_id,'Q4 e-tron'),(b_id,'Q4 Sportback e-tron'),
    (b_id,'TT'),(b_id,'R8'),(b_id,'e-tron GT');

  -- 12. Hyundai
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Hyundai', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'i10'),(b_id,'i20'),(b_id,'i20 N'),(b_id,'i30'),(b_id,'i30 N'),(b_id,'i30 Fastback'),
    (b_id,'Elantra'),(b_id,'Kona'),(b_id,'Kona Electric'),(b_id,'Tucson'),(b_id,'Santa Fe'),
    (b_id,'Ioniq'),(b_id,'Ioniq 5'),(b_id,'Ioniq 6'),(b_id,'Nexo'),(b_id,'Staria');

  -- 13. Kia
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Kia', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'Picanto'),(b_id,'Rio'),(b_id,'Ceed'),(b_id,'Ceed SW'),(b_id,'ProCeed'),
    (b_id,'Xceed'),(b_id,'Stonic'),(b_id,'Sportage'),(b_id,'Niro'),(b_id,'Niro EV'),
    (b_id,'Sorento'),(b_id,'Stinger'),(b_id,'EV6'),(b_id,'EV9'),(b_id,'Carnival');

  -- 14. Nissan
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Nissan', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'Micra'),(b_id,'Juke'),(b_id,'Qashqai'),(b_id,'X-Trail'),(b_id,'Leaf'),
    (b_id,'Ariya'),(b_id,'Navara'),(b_id,'Pathfinder'),(b_id,'NV200'),(b_id,'Primastar'),
    (b_id,'Townstar'),(b_id,'Interstar');

  -- 15. Mazda
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Mazda', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'Mazda2'),(b_id,'Mazda3'),(b_id,'Mazda3 Fastback'),(b_id,'Mazda6'),(b_id,'Mazda6 Wagon'),
    (b_id,'CX-3'),(b_id,'CX-30'),(b_id,'CX-5'),(b_id,'CX-60'),(b_id,'CX-80'),(b_id,'MX-5'),(b_id,'MX-30');

  -- 16. Honda
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Honda', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'Jazz'),(b_id,'Civic'),(b_id,'Civic Type R'),(b_id,'HR-V'),(b_id,'CR-V'),
    (b_id,'ZR-V'),(b_id,'e'),(b_id,'e:Ny1'),(b_id,'NSX');

  -- 17. Fiat
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Fiat', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'500'),(b_id,'500e'),(b_id,'500X'),(b_id,'500L'),(b_id,'Panda'),(b_id,'Tipo'),
    (b_id,'Tipo Cross'),(b_id,'Tipo Station Wagon'),(b_id,'Punto'),(b_id,'Doblò'),(b_id,'Scudo'),
    (b_id,'Ducato');

  -- 18. Alfa Romeo
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Alfa Romeo', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'MiTo'),(b_id,'Giulietta'),(b_id,'Giulia'),(b_id,'Stelvio'),(b_id,'Tonale'),
    (b_id,'Junior');

  -- 19. Jeep
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Jeep', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'Avenger'),(b_id,'Renegade'),(b_id,'Compass'),(b_id,'Cherokee'),(b_id,'Grand Cherokee'),
    (b_id,'Grand Cherokee 4xe'),(b_id,'Wrangler'),(b_id,'Gladiator');

  -- 20. Dacia
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Dacia', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'Sandero'),(b_id,'Sandero Stepway'),(b_id,'Logan'),(b_id,'Logan MCV'),(b_id,'Duster'),
    (b_id,'Jogger'),(b_id,'Bigster'),(b_id,'Spring');

  -- 21. Skoda
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Skoda', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'Fabia'),(b_id,'Scala'),(b_id,'Octavia'),(b_id,'Octavia Combi'),(b_id,'Superb'),
    (b_id,'Superb Combi'),(b_id,'Kamiq'),(b_id,'Karoq'),(b_id,'Kodiaq'),(b_id,'Enyaq'),(b_id,'Enyaq Coupé');

  -- 22. MINI
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('MINI', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'Cooper'),(b_id,'Cooper S'),(b_id,'Cooper SE'),(b_id,'Cabrio'),(b_id,'Clubman'),
    (b_id,'Countryman'),(b_id,'Countryman Electric'),(b_id,'Paceman'),(b_id,'Aceman'),(b_id,'John Cooper Works');

  -- 23. Volvo
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Volvo', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'S60'),(b_id,'S90'),(b_id,'V60'),(b_id,'V60 Cross Country'),(b_id,'V90'),
    (b_id,'V90 Cross Country'),(b_id,'XC40'),(b_id,'XC40 Recharge'),(b_id,'XC60'),(b_id,'XC90'),
    (b_id,'C40 Recharge'),(b_id,'EX30'),(b_id,'EX90');

  -- 24. Tesla
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Tesla', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'Model 3'),(b_id,'Model Y'),(b_id,'Model S'),(b_id,'Model X'),(b_id,'Cybertruck');

  -- 25. Subaru
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Subaru', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'Impreza'),(b_id,'Legacy'),(b_id,'Outback'),(b_id,'Forester'),(b_id,'XV/Crosstrek'),
    (b_id,'BRZ'),(b_id,'WRX'),(b_id,'Solterra');

  -- 26. Mitsubishi
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Mitsubishi', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'Space Star'),(b_id,'Colt'),(b_id,'ASX'),(b_id,'Eclipse Cross'),(b_id,'Outlander'),
    (b_id,'Outlander PHEV'),(b_id,'L200');

  -- 27. Land Rover
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Land Rover', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'Defender'),(b_id,'Discovery'),(b_id,'Discovery Sport'),(b_id,'Range Rover'),
    (b_id,'Range Rover Sport'),(b_id,'Range Rover Evoque'),(b_id,'Range Rover Velar');

  -- 28. Porsche
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Porsche', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'911'),(b_id,'718 Boxster'),(b_id,'718 Cayman'),(b_id,'718 Spyder'),
    (b_id,'Macan'),(b_id,'Macan Electric'),(b_id,'Cayenne'),(b_id,'Cayenne Coupé'),
    (b_id,'Panamera'),(b_id,'Taycan'),(b_id,'Taycan Cross Turismo');

  -- 29. Lexus
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Lexus', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'IS'),(b_id,'ES'),(b_id,'GS'),(b_id,'LS'),(b_id,'UX'),(b_id,'NX'),(b_id,'RX'),
    (b_id,'GX'),(b_id,'LX'),(b_id,'LC'),(b_id,'RC'),(b_id,'RZ');

  -- 30. Cupra
  INSERT INTO public.vehicle_brands (name, vehicle_type) VALUES ('Cupra', 'coches') RETURNING id INTO b_id;
  INSERT INTO public.vehicle_models (brand_id, name) VALUES
    (b_id,'Formentor'),(b_id,'Ateca'),(b_id,'León'),(b_id,'León Sportstourer'),(b_id,'Born'),
    (b_id,'Terramar'),(b_id,'Tavascan');

END $$;
