-- =====================================================
-- ACTOOS ONE — SEED DATA (Données de production)
-- =====================================================
-- Exécuter APRÈS 001_foundation.sql
-- =====================================================

-- =====================================================
-- 1. ZONES DE LIVRAISON - Bamako
-- =====================================================
INSERT INTO delivery_zones (id, name, city) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Hamdallaye', 'Bamako'),
  ('11111111-1111-1111-1111-111111111102', 'ACI 2000', 'Bamako'),
  ('11111111-1111-1111-1111-111111111103', 'Badalabougou', 'Bamako'),
  ('11111111-1111-1111-1111-111111111104', 'Kalaban Coura', 'Bamako'),
  ('11111111-1111-1111-1111-111111111105', 'Sotuba', 'Bamako'),
  ('11111111-1111-1111-1111-111111111106', 'Faladiè', 'Bamako')
ON CONFLICT DO NOTHING;

-- =====================================================
-- 2. RESTAURANTS / PARTNERS
-- =====================================================
INSERT INTO partners (id, name, category, description, image_url, address, city, latitude, longitude, accepts_cash, delivery_mode, commission_rate, is_active, is_open, avg_prep_time_minutes) VALUES

-- Restaurant 1: Maquis Chez Tanti (Africain)
('22222222-2222-2222-2222-222222222201', 
 'Maquis Chez Tanti', 
 'Africain', 
 'Cuisine africaine authentique, poulet braisé et plats traditionnels', 
 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
 'Hamdallaye ACI, Bamako',
 'Bamako',
 12.6392, -8.0029,
 true, 'actoos', 15.00, true, true, 25),

-- Restaurant 2: Le Djoliba (Africain)
('22222222-2222-2222-2222-222222222202', 
 'Le Djoliba', 
 'Africain', 
 'Restaurant traditionnel malien avec vue sur le fleuve', 
 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop',
 'Badalabougou, Bamako',
 'Bamako',
 12.6234, -7.9876,
 false, 'actoos', 15.00, true, true, 35),

-- Restaurant 3: Fast Food Bamako (Fast Food)
('22222222-2222-2222-2222-222222222203', 
 'Fast Food Bamako', 
 'Fast Food', 
 'Burgers, frites et sandwichs - Rapide et savoureux', 
 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
 'ACI 2000, Bamako',
 'Bamako',
 12.6456, -8.0123,
 true, 'self', 10.00, true, true, 15),

-- Restaurant 4: Saveurs du Niger (Africain)
('22222222-2222-2222-2222-222222222204', 
 'Saveurs du Niger', 
 'Africain', 
 'Spécialités nigériennes et cuisine du Sahel', 
 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop',
 'Kalaban Coura, Bamako',
 'Bamako',
 12.5987, -7.9654,
 true, 'actoos', 15.00, true, false, 40),

-- Restaurant 5: Pizza Mama Africa (Pizza)
('22222222-2222-2222-2222-222222222205', 
 'Pizza Mama Africa', 
 'Pizza', 
 'Pizzas artisanales avec saveurs africaines', 
 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
 'Hamdallaye, Bamako',
 'Bamako',
 12.6401, -8.0045,
 true, 'self', 10.00, true, true, 25),

-- Restaurant 6: Grillades de Bamako (Grillades)
('22222222-2222-2222-2222-222222222206', 
 'Grillades de Bamako', 
 'Grillades', 
 'Viandes grillées au feu de bois, ambiance conviviale', 
 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop',
 'Sotuba, Bamako',
 'Bamako',
 12.6512, -7.9789,
 false, 'actoos', 15.00, true, true, 20),

-- Restaurant 7: Sushi Bamako (Sushi)
('22222222-2222-2222-2222-222222222207', 
 'Sushi Bamako', 
 'Sushi', 
 'Sushis frais et cuisine japonaise fusion', 
 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&h=300&fit=crop',
 'ACI 2000, Bamako',
 'Bamako',
 12.6478, -8.0156,
 false, 'actoos', 15.00, true, true, 30),

-- Restaurant 8: Café de Paris (Café)
('22222222-2222-2222-2222-222222222208', 
 'Café de Paris', 
 'Café', 
 'Café, croissants et pâtisseries françaises', 
 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop',
 'Hamdallaye, Bamako',
 'Bamako',
 12.6385, -8.0012,
 true, 'self', 10.00, true, true, 10),

-- Restaurant 9: Smoothie & Juice Bar (Smoothie)
('22222222-2222-2222-2222-222222222209', 
 'Smoothie & Juice Bar', 
 'Smoothie', 
 'Jus frais, smoothies et bowls healthy', 
 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=400&h=300&fit=crop',
 'Badalabougou, Bamako',
 'Bamako',
 12.6245, -7.9901,
 true, 'self', 10.00, true, true, 10),

-- Restaurant 10: Ice Cream Paradise (Ice Cream)
('22222222-2222-2222-2222-222222222210', 
 'Ice Cream Paradise', 
 'Ice Cream', 
 'Glaces artisanales et desserts glacés', 
 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400&h=300&fit=crop',
 'ACI 2000, Bamako',
 'Bamako',
 12.6467, -8.0089,
 true, 'self', 10.00, true, true, 5)

ON CONFLICT DO NOTHING;

-- =====================================================
-- 3. MENU ITEMS - Maquis Chez Tanti
-- =====================================================
INSERT INTO menu_items (id, partner_id, name, description, price, image_url, category, is_available, max_per_order, sort_order) VALUES

-- Plats principaux
('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 
 'Poulet Braisé', 'Poulet mariné grillé au feu de bois, servi avec alloco et attiéké', 
 3500, 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=300&h=200&fit=crop', 
 'Plats principaux', true, 5, 1),

('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222201', 
 'Riz au Gras', 'Riz cuit dans une sauce tomate épicée avec viande de bœuf', 
 2500, 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=300&h=200&fit=crop', 
 'Plats principaux', true, 10, 2),

('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222201', 
 'Tiep Bou Dien', 'Riz au poisson sénégalais avec légumes', 
 4000, 'https://images.unsplash.com/photo-1574484284002-952d92456975?w=300&h=200&fit=crop', 
 'Plats principaux', true, 5, 3),

('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222201', 
 'Sauce Arachide', 'Sauce onctueuse aux arachides avec poulet, servi avec riz ou foutou', 
 3000, 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=300&h=200&fit=crop', 
 'Plats principaux', true, 5, 4),

-- Accompagnements
('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222201', 
 'Alloco', 'Bananes plantains frites dorées', 
 500, 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?w=300&h=200&fit=crop', 
 'Accompagnements', true, 10, 10),

('33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222201', 
 'Attiéké', 'Semoule de manioc traditionnelle', 
 300, 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=300&h=200&fit=crop', 
 'Accompagnements', true, 10, 11),

-- Boissons
('33333333-3333-3333-3333-333333333307', '22222222-2222-2222-2222-222222222201', 
 'Bissap', 'Jus d''hibiscus frais maison', 
 500, 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300&h=200&fit=crop', 
 'Boissons', true, 10, 20),

('33333333-3333-3333-3333-333333333308', '22222222-2222-2222-2222-222222222201', 
 'Gingembre', 'Jus de gingembre frais pimenté', 
 500, 'https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=300&h=200&fit=crop', 
 'Boissons', true, 10, 21),

-- =====================================================
-- 4. MENU ITEMS - Fast Food Bamako
-- =====================================================
('33333333-3333-3333-3333-333333333401', '22222222-2222-2222-2222-222222222203', 
 'Classic Burger', 'Steak haché, salade, tomate, oignon, sauce maison', 
 2500, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=200&fit=crop', 
 'Burgers', true, 5, 1),

('33333333-3333-3333-3333-333333333402', '22222222-2222-2222-2222-222222222203', 
 'Cheese Burger', 'Steak haché, double cheddar, sauce burger', 
 3000, 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=300&h=200&fit=crop', 
 'Burgers', true, 5, 2),

('33333333-3333-3333-3333-333333333403', '22222222-2222-2222-2222-222222222203', 
 'Double Burger', 'Double steak, bacon, fromage, sauce spéciale', 
 4500, 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=300&h=200&fit=crop', 
 'Burgers', true, 3, 3),

('33333333-3333-3333-3333-333333333404', '22222222-2222-2222-2222-222222222203', 
 'Frites', 'Frites croustillantes maison', 
 800, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=300&h=200&fit=crop', 
 'Accompagnements', true, 10, 10),

('33333333-3333-3333-3333-333333333405', '22222222-2222-2222-2222-222222222203', 
 'Coca-Cola', 'Canette 33cl', 
 500, 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=300&h=200&fit=crop', 
 'Boissons', true, 10, 20),

-- =====================================================
-- 5. MENU ITEMS - Pizza Mama Africa
-- =====================================================
('33333333-3333-3333-3333-333333333501', '22222222-2222-2222-2222-222222222205', 
 'Margherita', 'Tomate, mozzarella, basilic frais', 
 3500, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=300&h=200&fit=crop', 
 'Pizzas', true, 5, 1),

('33333333-3333-3333-3333-333333333502', '22222222-2222-2222-2222-222222222205', 
 'Africana', 'Poulet épicé, poivrons, oignons, sauce pili-pili', 
 4500, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=300&h=200&fit=crop', 
 'Pizzas', true, 5, 2),

('33333333-3333-3333-3333-333333333503', '22222222-2222-2222-2222-222222222205', 
 '4 Fromages', 'Mozzarella, gorgonzola, parmesan, chèvre', 
 5000, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&h=200&fit=crop', 
 'Pizzas', true, 5, 3),

-- =====================================================
-- 6. MENU ITEMS - Grillades de Bamako
-- =====================================================
('33333333-3333-3333-3333-333333333601', '22222222-2222-2222-2222-222222222206', 
 'Brochettes de Bœuf', '6 brochettes de bœuf marinées, grillées au charbon', 
 4000, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&h=200&fit=crop', 
 'Grillades', true, 5, 1),

('33333333-3333-3333-3333-333333333602', '22222222-2222-2222-2222-222222222206', 
 'Côtelettes d''Agneau', 'Côtelettes d''agneau grillées aux herbes', 
 5500, 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=300&h=200&fit=crop', 
 'Grillades', true, 3, 2),

('33333333-3333-3333-3333-333333333603', '22222222-2222-2222-2222-222222222206', 
 'Capitaine Grillé', 'Poisson capitaine entier grillé, sauce oignon', 
 6000, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=300&h=200&fit=crop', 
 'Grillades', true, 3, 3),

-- =====================================================
-- 7. MENU ITEMS - Sushi Bamako
-- =====================================================
('33333333-3333-3333-3333-333333333701', '22222222-2222-2222-2222-222222222207', 
 'Sashimi Saumon', '8 pièces de saumon frais', 
 5500, 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&h=200&fit=crop', 
 'Sashimi', true, 5, 1),

('33333333-3333-3333-3333-333333333702', '22222222-2222-2222-2222-222222222207', 
 'California Roll', '8 pièces - Avocat, crabe, concombre', 
 4000, 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=300&h=200&fit=crop', 
 'Makis', true, 5, 2),

('33333333-3333-3333-3333-333333333703', '22222222-2222-2222-2222-222222222207', 
 'Plateau Découverte', '24 pièces variées - Sashimi, maki, nigiri', 
 12000, 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=300&h=200&fit=crop', 
 'Plateaux', true, 2, 3),

-- =====================================================
-- 8. MENU ITEMS - Café de Paris
-- =====================================================
('33333333-3333-3333-3333-333333333801', '22222222-2222-2222-2222-222222222208', 
 'Croissant Beurre', 'Croissant pur beurre, fraîchement cuit', 
 800, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=300&h=200&fit=crop', 
 'Viennoiseries', true, 10, 1),

('33333333-3333-3333-3333-333333333802', '22222222-2222-2222-2222-222222222208', 
 'Pain au Chocolat', 'Viennoiserie au chocolat noir', 
 900, 'https://images.unsplash.com/photo-1530610476181-d83430b64dcd?w=300&h=200&fit=crop', 
 'Viennoiseries', true, 10, 2),

('33333333-3333-3333-3333-333333333803', '22222222-2222-2222-2222-222222222208', 
 'Espresso', 'Café espresso italien', 
 500, 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=300&h=200&fit=crop', 
 'Cafés', true, 10, 10),

('33333333-3333-3333-3333-333333333804', '22222222-2222-2222-2222-222222222208', 
 'Cappuccino', 'Espresso, lait mousseux, cacao', 
 1000, 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=300&h=200&fit=crop', 
 'Cafés', true, 10, 11),

-- =====================================================
-- 9. MENU ITEMS - Smoothie & Juice Bar
-- =====================================================
('33333333-3333-3333-3333-333333333901', '22222222-2222-2222-2222-222222222209', 
 'Smoothie Mangue', 'Mangue fraîche, banane, lait de coco', 
 1500, 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=300&h=200&fit=crop', 
 'Smoothies', true, 5, 1),

('33333333-3333-3333-3333-333333333902', '22222222-2222-2222-2222-222222222209', 
 'Jus d''Orange Pressé', 'Oranges fraîches pressées minute', 
 1000, 'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=300&h=200&fit=crop', 
 'Jus Frais', true, 10, 2),

('33333333-3333-3333-3333-333333333903', '22222222-2222-2222-2222-222222222209', 
 'Açaí Bowl', 'Açaí, granola, fruits frais, miel', 
 2500, 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=300&h=200&fit=crop', 
 'Bowls', true, 5, 3),

-- =====================================================
-- 10. MENU ITEMS - Ice Cream Paradise
-- =====================================================
('33333333-3333-3333-3333-333333331001', '22222222-2222-2222-2222-222222222210', 
 'Coupe 2 Boules', 'Choix parmi: vanille, chocolat, fraise, mangue, coco', 
 1500, 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=300&h=200&fit=crop', 
 'Glaces', true, 5, 1),

('33333333-3333-3333-3333-333333331002', '22222222-2222-2222-2222-222222222210', 
 'Banana Split', 'Banane, 3 boules, chantilly, chocolat, amandes', 
 2500, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300&h=200&fit=crop', 
 'Coupes', true, 3, 2),

('33333333-3333-3333-3333-333333331003', '22222222-2222-2222-2222-222222222210', 
 'Milkshake', 'Milkshake crémeux - Vanille, chocolat ou fraise', 
 1200, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=300&h=200&fit=crop', 
 'Boissons Glacées', true, 5, 3)

ON CONFLICT DO NOTHING;

-- =====================================================
-- 11. Configuration système par défaut
-- =====================================================
UPDATE system_config SET 
  feature_eats = true,
  feature_health = true,
  feature_wallet = true,
  feature_p2p = true,
  updated_at = NOW()
WHERE id = 1;

-- =====================================================
-- DONE! Base de données prête pour production
-- =====================================================
