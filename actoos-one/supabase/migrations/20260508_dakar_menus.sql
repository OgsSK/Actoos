-- ================================================================
-- ACTOOS ONE - Migration Menus Restaurants Dakar
-- À exécuter dans Supabase SQL Editor
-- Date: 8 Mai 2026
-- ================================================================

-- ============================================================
-- 1. MENUS PIZZA TERANGA
-- ============================================================
INSERT INTO menu_items (partner_id, name, description, price, image_url, category, is_available, is_popular, preparation_time) VALUES
-- Pizzas
('11938527-b851-4fb6-a96e-12bfe6ec2ed9', 'Pizza Margherita', 'Tomate, mozzarella, basilic frais', 4500, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop', 'Pizzas Classiques', true, true, 20),
('11938527-b851-4fb6-a96e-12bfe6ec2ed9', 'Pizza Teranga Special', 'Poulet yassa, oignons caramélisés, poivrons, mozzarella', 6500, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop', 'Pizzas Spéciales', true, true, 25),
('11938527-b851-4fb6-a96e-12bfe6ec2ed9', 'Pizza 4 Fromages', 'Mozzarella, gorgonzola, parmesan, chèvre', 5500, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop', 'Pizzas Classiques', true, false, 20),
('11938527-b851-4fb6-a96e-12bfe6ec2ed9', 'Pizza Dibi', 'Viande de mouton grillée, oignons, épices locales', 7000, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop', 'Pizzas Spéciales', true, false, 25),
-- Desserts et Boissons
('11938527-b851-4fb6-a96e-12bfe6ec2ed9', 'Tiramisu Maison', 'Dessert italien traditionnel', 2500, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=300&fit=crop', 'Desserts', true, false, 5),
('11938527-b851-4fb6-a96e-12bfe6ec2ed9', 'Coca-Cola', 'Canette 33cl', 500, 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop', 'Boissons', true, false, 1);

-- ============================================================
-- 2. MENUS DAKAR BURGER HOUSE
-- ============================================================
INSERT INTO menu_items (partner_id, name, description, price, image_url, category, is_available, is_popular, preparation_time) VALUES
-- Burgers
('a379ad05-3057-47f3-8e80-8580a2391d7b', 'Classic Burger', 'Steak haché 150g, cheddar, salade, tomate, oignons', 3500, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop', 'Burgers', true, true, 15),
('a379ad05-3057-47f3-8e80-8580a2391d7b', 'Double Cheese Burger', 'Double steak, double cheddar, bacon croustillant', 5500, 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop', 'Burgers', true, true, 18),
('a379ad05-3057-47f3-8e80-8580a2391d7b', 'Chicken Burger', 'Filet de poulet pané, sauce mayo-curry', 3000, 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&h=300&fit=crop', 'Burgers', true, false, 15),
-- Accompagnements
('a379ad05-3057-47f3-8e80-8580a2391d7b', 'Frites Maison', 'Portion généreuse de frites dorées', 1500, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop', 'Accompagnements', true, false, 10),
('a379ad05-3057-47f3-8e80-8580a2391d7b', 'Onion Rings', 'Rondelles d''oignons panées', 1800, 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400&h=300&fit=crop', 'Accompagnements', true, false, 10),
-- Boissons
('a379ad05-3057-47f3-8e80-8580a2391d7b', 'Milkshake Vanille', 'Milkshake crémeux à la vanille', 2000, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop', 'Boissons', true, false, 5);

-- ============================================================
-- 3. MENUS CHEZ FATOU (THIEBOUDIENNE)
-- ============================================================
INSERT INTO menu_items (partner_id, name, description, price, image_url, category, is_available, is_popular, preparation_time) VALUES
-- Plats Principaux
('aaa59b5a-7f34-44c3-a020-f81b0735af76', 'Thieboudienne Poisson', 'Le plat national : riz au poisson avec légumes (carotte, chou, manioc)', 3500, 'https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400&h=300&fit=crop', 'Plats Principaux', true, true, 20),
('aaa59b5a-7f34-44c3-a020-f81b0735af76', 'Thieboudienne Viande', 'Variante au boeuf du thieboudienne traditionnel', 4000, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop', 'Plats Principaux', true, true, 25),
('aaa59b5a-7f34-44c3-a020-f81b0735af76', 'Yassa Poulet', 'Poulet mariné aux oignons et citron, servi avec riz', 3000, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&h=300&fit=crop', 'Plats Principaux', true, true, 20),
('aaa59b5a-7f34-44c3-a020-f81b0735af76', 'Mafé Boeuf', 'Ragoût de boeuf à la pâte d''arachide, servi avec riz', 3500, 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop', 'Plats Principaux', true, false, 25),
-- Boissons
('aaa59b5a-7f34-44c3-a020-f81b0735af76', 'Bissap', 'Jus d''hibiscus frais (50cl)', 500, 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400&h=300&fit=crop', 'Boissons', true, true, 2),
('aaa59b5a-7f34-44c3-a020-f81b0735af76', 'Gingembre', 'Jus de gingembre frais (50cl)', 500, 'https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=400&h=300&fit=crop', 'Boissons', true, false, 2);

-- ============================================================
-- 4. MENUS DIBITERIE NDOYE
-- ============================================================
INSERT INTO menu_items (partner_id, name, description, price, image_url, category, is_available, is_popular, preparation_time) VALUES
-- Grillades
('fd38b1ce-224c-4f83-a35b-ed14ed448db6', 'Dibi Mouton (500g)', 'Mouton grillé aux épices, servi avec oignons', 5000, 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop', 'Grillades', true, true, 20),
('fd38b1ce-224c-4f83-a35b-ed14ed448db6', 'Dibi Mouton (1kg)', 'Grande portion de mouton grillé pour 2-3 personnes', 9000, 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=400&h=300&fit=crop', 'Grillades', true, true, 25),
('fd38b1ce-224c-4f83-a35b-ed14ed448db6', 'Brochettes Boeuf (6 pcs)', 'Brochettes de boeuf marinées et grillées', 3500, 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400&h=300&fit=crop', 'Grillades', true, false, 15),
('fd38b1ce-224c-4f83-a35b-ed14ed448db6', 'Foie Grillé', 'Foie de mouton grillé aux oignons', 2500, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop', 'Grillades', true, false, 15),
-- Accompagnements
('fd38b1ce-224c-4f83-a35b-ed14ed448db6', 'Pain Tapalapa', 'Pain traditionnel sénégalais', 200, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop', 'Accompagnements', true, false, 1),
-- Boissons
('fd38b1ce-224c-4f83-a35b-ed14ed448db6', 'Ataya (Thé Sénégalais)', '3 verres de thé à la menthe traditionnel', 500, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&h=300&fit=crop', 'Boissons', true, true, 10);

-- ============================================================
-- 5. VÉRIFICATION
-- ============================================================
SELECT 'Menus Dakar créés avec succès!' AS status;

SELECT p.name AS restaurant, COUNT(m.id) AS nb_items
FROM partners p
LEFT JOIN menu_items m ON m.partner_id = p.id
WHERE p.city = 'Dakar'
GROUP BY p.id, p.name
ORDER BY p.name;
