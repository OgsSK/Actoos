-- =====================================================
-- ACTOOS ONE - DONNEES DE TEST (SEED)
-- =====================================================
-- Restaurants et menus pour Bamako, Mali
-- =====================================================

-- =====================================================
-- RESTAURANTS
-- =====================================================
INSERT INTO partners (name, description, category, image_url, address, city, phone, is_active, is_verified, rating, preparation_time, delivery_fee, opens_at, closes_at) VALUES

-- Restaurant 1: Maquis Africain
('Maquis Chez Tanti', 
 'Cuisine africaine authentique. Spécialités maliennes et ivoiriennes préparées avec amour.',
 'Africain',
 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400',
 'Hamdallaye ACI 2000, Bamako',
 'Bamako',
 '+223 70 11 22 33',
 true, true, 4.8, 25, 500, '10:00', '23:00'),

-- Restaurant 2: Fast Food
('Fast Food Bamako',
 'Burgers, frites et sandwichs. Rapide et délicieux!',
 'Fast Food',
 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
 'Quartier du Fleuve, Bamako',
 'Bamako',
 '+223 70 22 33 44',
 true, true, 4.5, 15, 500, '09:00', '00:00'),

-- Restaurant 3: Pizza
('Pizza Mama Africa',
 'Pizzas artisanales cuites au feu de bois. Ingrédients frais et locaux.',
 'Pizza',
 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
 'Badalabougou, Bamako',
 'Bamako',
 '+223 70 33 44 55',
 true, true, 4.7, 30, 750, '11:00', '23:00'),

-- Restaurant 4: Grillades
('Grillades de Bamako',
 'Viandes grillées, brochettes et accompagnements traditionnels.',
 'Grillades',
 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
 'Sotuba, Bamako',
 'Bamako',
 '+223 70 44 55 66',
 true, true, 4.6, 20, 500, '12:00', '22:00'),

-- Restaurant 5: Cafe
('Cafe de Paris Bamako',
 'Petit-déjeuner, brunch et pâtisseries françaises.',
 'Cafe',
 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
 'ACI 2000, Bamako',
 'Bamako',
 '+223 70 55 66 77',
 true, true, 4.4, 15, 500, '07:00', '20:00'),

-- Restaurant 6: Poulet
('Poulet Braise Express',
 'Poulet braisé croustillant avec sauces maison. Le meilleur de Bamako!',
 'Poulet',
 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400',
 'Kalaban Coura, Bamako',
 'Bamako',
 '+223 70 66 77 88',
 true, true, 4.9, 25, 500, '11:00', '23:00'),

-- Restaurant 7: Shawarma
('Shawarma King',
 'Shawarmas, falafels et spécialités libanaises.',
 'Libanais',
 'https://images.unsplash.com/photo-1561651823-34feb02250e4?w=400',
 'Hippodrome, Bamako',
 'Bamako',
 '+223 70 77 88 99',
 true, true, 4.5, 15, 500, '10:00', '01:00'),

-- Restaurant 8: Senegalais
('Thieboudienne House',
 'Cuisine sénégalaise. Thieboudienne, yassa et mafé authentiques.',
 'Senegalais',
 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400',
 'Magnambougou, Bamako',
 'Bamako',
 '+223 70 88 99 00',
 true, true, 4.7, 30, 500, '11:00', '22:00');

-- =====================================================
-- MENUS - Maquis Chez Tanti
-- =====================================================
INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Riz au gras', 'Riz parfumé avec viande de boeuf et légumes', 2500, 'Plats', true, true
FROM partners WHERE name = 'Maquis Chez Tanti';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Poulet DG', 'Poulet Directeur Général avec bananes plantains', 3500, 'Plats', true, true
FROM partners WHERE name = 'Maquis Chez Tanti';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Attiéké Poisson', 'Attiéké avec poisson braisé et sauce', 3000, 'Plats', true, false
FROM partners WHERE name = 'Maquis Chez Tanti';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Alloco', 'Bananes plantains frites croustillantes', 1000, 'Accompagnements', true, true
FROM partners WHERE name = 'Maquis Chez Tanti';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Bissap', 'Jus de bissap frais maison', 500, 'Boissons', true, false
FROM partners WHERE name = 'Maquis Chez Tanti';

-- =====================================================
-- MENUS - Fast Food Bamako
-- =====================================================
INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Burger Classic', 'Steak haché, salade, tomate, oignon, sauce maison', 2500, 'Burgers', true, true
FROM partners WHERE name = 'Fast Food Bamako';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Burger Double', 'Double steak, double fromage, bacon', 4000, 'Burgers', true, true
FROM partners WHERE name = 'Fast Food Bamako';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Chicken Burger', 'Filet de poulet pané croustillant', 3000, 'Burgers', true, false
FROM partners WHERE name = 'Fast Food Bamako';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Frites', 'Portion de frites dorées', 1000, 'Accompagnements', true, true
FROM partners WHERE name = 'Fast Food Bamako';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Coca Cola', 'Canette 33cl', 500, 'Boissons', true, false
FROM partners WHERE name = 'Fast Food Bamako';

-- =====================================================
-- MENUS - Pizza Mama Africa
-- =====================================================
INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Pizza Margherita', 'Sauce tomate, mozzarella, basilic frais', 4500, 'Pizzas', true, true
FROM partners WHERE name = 'Pizza Mama Africa';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Pizza Africana', 'Poulet, oignons, poivrons, épices africaines', 5500, 'Pizzas', true, true
FROM partners WHERE name = 'Pizza Mama Africa';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Pizza 4 Fromages', 'Mozzarella, gorgonzola, parmesan, chèvre', 5000, 'Pizzas', true, false
FROM partners WHERE name = 'Pizza Mama Africa';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Tiramisu', 'Dessert italien traditionnel', 2000, 'Desserts', true, false
FROM partners WHERE name = 'Pizza Mama Africa';

-- =====================================================
-- MENUS - Grillades de Bamako
-- =====================================================
INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Brochettes Boeuf x5', '5 brochettes de boeuf marinées', 3000, 'Brochettes', true, true
FROM partners WHERE name = 'Grillades de Bamako';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Brochettes Mouton x5', '5 brochettes de mouton tendres', 3500, 'Brochettes', true, true
FROM partners WHERE name = 'Grillades de Bamako';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Côtelettes Grillées', 'Côtelettes de mouton grillées au charbon', 4500, 'Viandes', true, false
FROM partners WHERE name = 'Grillades de Bamako';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Salade Mixte', 'Salade fraîche de saison', 1000, 'Accompagnements', true, false
FROM partners WHERE name = 'Grillades de Bamako';

-- =====================================================
-- MENUS - Cafe de Paris Bamako
-- =====================================================
INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Croissant Beurre', 'Croissant pur beurre croustillant', 800, 'Viennoiseries', true, true
FROM partners WHERE name = 'Cafe de Paris Bamako';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Pain au Chocolat', 'Viennoiserie au chocolat fondant', 1000, 'Viennoiseries', true, true
FROM partners WHERE name = 'Cafe de Paris Bamako';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Cafe Latte', 'Espresso avec lait mousseux', 1500, 'Boissons Chaudes', true, true
FROM partners WHERE name = 'Cafe de Paris Bamako';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Petit-Dejeuner Complet', 'Croissant, pain, confiture, jus, café', 3500, 'Petit-Dejeuner', true, false
FROM partners WHERE name = 'Cafe de Paris Bamako';

-- =====================================================
-- MENUS - Poulet Braise Express
-- =====================================================
INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Poulet Braisé Entier', 'Poulet entier braisé aux épices', 5000, 'Poulet', true, true
FROM partners WHERE name = 'Poulet Braise Express';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Demi Poulet Braisé', 'Demi poulet avec frites ou alloco', 3000, 'Poulet', true, true
FROM partners WHERE name = 'Poulet Braise Express';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Ailes de Poulet x10', '10 ailes de poulet épicées', 2500, 'Poulet', true, false
FROM partners WHERE name = 'Poulet Braise Express';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Sauce Piment', 'Sauce piment maison', 300, 'Sauces', true, false
FROM partners WHERE name = 'Poulet Braise Express';

-- =====================================================
-- MENUS - Shawarma King
-- =====================================================
INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Shawarma Poulet', 'Shawarma au poulet mariné avec sauce tahini', 2000, 'Shawarmas', true, true
FROM partners WHERE name = 'Shawarma King';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Shawarma Viande', 'Shawarma au boeuf épicé', 2500, 'Shawarmas', true, true
FROM partners WHERE name = 'Shawarma King';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Falafel Wrap', 'Wrap végétarien aux falafels', 1800, 'Vegetarien', true, false
FROM partners WHERE name = 'Shawarma King';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Houmous', 'Houmous maison avec pain pita', 1200, 'Entrees', true, false
FROM partners WHERE name = 'Shawarma King';

-- =====================================================
-- MENUS - Thieboudienne House
-- =====================================================
INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Thieboudienne', 'Riz au poisson sénégalais traditionnel', 3000, 'Plats', true, true
FROM partners WHERE name = 'Thieboudienne House';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Yassa Poulet', 'Poulet mariné aux oignons et citron', 3500, 'Plats', true, true
FROM partners WHERE name = 'Thieboudienne House';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Mafé Boeuf', 'Ragoût de boeuf à la sauce arachide', 3000, 'Plats', true, false
FROM partners WHERE name = 'Thieboudienne House';

INSERT INTO menu_items (partner_id, name, description, price, category, is_available, is_popular) 
SELECT id, 'Jus de Gingembre', 'Gingembre frais pressé', 500, 'Boissons', true, false
FROM partners WHERE name = 'Thieboudienne House';

-- =====================================================
-- COMPTE ADMIN
-- =====================================================
INSERT INTO users (email, name, role, is_active) 
VALUES ('contact@actoos.com', 'Admin ACTOOS', 'admin', true)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- SEED TERMINE
-- =====================================================
