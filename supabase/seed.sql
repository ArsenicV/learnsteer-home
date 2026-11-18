-- Example seed data. Adjust IDs/values as needed.
insert into public.roadmap_stages (title,status,date_label,description,sort_order) values
('Idea & Founding','Completed','2024','A group of students sets out to steer learning themselves.',1),
('Pilot Programs','Completed','2025','First youth-led programs tested with partner schools.',2),
('LearnSteer 2.0 Platform','In progress','2026','Building the platform that connects learners and mentors.',3),
('Island-wide Expansion','Planned','2027','Bringing the program to every district.',4);

-- Add real contributors via admin UI or inserts here, e.g.:
-- insert into public.contributors (name,role,team,image_path,link,sort_order) values
-- ('Ayesha Perera','Programs Lead','Programs','contributors/ayesha.webp','https://...',1);

-- To grant admin access, create a user in Supabase Auth then:
-- insert into public.profiles (id,is_admin) values ('<auth-user-uuid>', true);
