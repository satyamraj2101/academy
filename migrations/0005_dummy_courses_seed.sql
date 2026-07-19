-- SpotCLM Academy - Dummy Modules and Lessons for Existing Courses
-- 0005_dummy_courses_seed.sql

-- Course: Platform Master Administration (platform-master)
INSERT OR IGNORE INTO academy_modules (id, course_id, title, description, sort_order) VALUES 
('mod-pm-1', 'platform-master', 'Module 1: Advanced Administration', 'Deep dive into user management and security.', 1),
('mod-pm-2', 'platform-master', 'Module 2: API & Integrations', 'How to connect SpotCLM with ERP and CRM systems.', 2);

INSERT OR IGNORE INTO academy_lessons (id, module_id, title, content_type, content_body, video_url, sort_order) VALUES
('les-pm-1-1', 'mod-pm-1', 'User Roles & Permissions', 'video', 'Learn how to configure granular security.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1),
('les-pm-1-2', 'mod-pm-1', 'SSO Setup', 'text', '# Single Sign-On (SSO)\n\nSetting up SAML 2.0 or OAuth is critical for enterprise security.\n\n> [!TIP]\n> Always test SSO in a sandbox environment first!', NULL, 2),
('les-pm-2-1', 'mod-pm-2', 'REST API Basics', 'video', 'Introduction to the SpotCLM REST API endpoints.', 'https://www.youtube.com/embed/jNQXAC9IVRw', 1);


-- Course: Advanced Workflow & Automation (advanced-workflow)
INSERT OR IGNORE INTO academy_modules (id, course_id, title, description, sort_order) VALUES 
('mod-aw-1', 'advanced-workflow', 'Module 1: Workflow Engine', 'Mastering the visual workflow designer.', 1),
('mod-aw-2', 'advanced-workflow', 'Module 2: Conditional Logic', 'Building complex routing rules.', 2);

INSERT OR IGNORE INTO academy_lessons (id, module_id, title, content_type, content_body, video_url, sort_order) VALUES
('les-aw-1-1', 'mod-aw-1', 'Introduction to Workflows', 'video', 'A tour of the visual designer.', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1),
('les-aw-1-2', 'mod-aw-1', 'Approvals & Routing', 'text', '# Approval Routing\n\n```mermaid\ngraph TD;\n    Start-->Review;\n    Review-->|Approved|Sign;\n    Review-->|Rejected|End;\n```\n\nConfigure your approvals exactly like the diagram above.', NULL, 2),
('les-aw-2-1', 'mod-aw-2', 'Writing Complex Conditions', 'text', '# Conditions\n\nUse our expression language to write dynamic rules.', NULL, 1);


-- Course: Enterprise CLM Consulting Mastery (clm-consulting)
INSERT OR IGNORE INTO academy_modules (id, course_id, title, description, sort_order) VALUES 
('mod-cc-1', 'clm-consulting', 'Module 1: Requirements Gathering', 'How to run effective workshops.', 1);

INSERT OR IGNORE INTO academy_lessons (id, module_id, title, content_type, content_body, video_url, sort_order) VALUES
('les-cc-1-1', 'mod-cc-1', 'The Blueprint Workshop', 'video', 'Running your first enterprise requirements workshop.', 'https://www.youtube.com/embed/jNQXAC9IVRw', 1),
('les-cc-1-2', 'mod-cc-1', 'Documentation Standards', 'text', '# Documentation\n\n> [!IMPORTANT]\n> Always document the current state before designing the future state.', NULL, 2);

-- Update courses to reflect they have modules/lessons
UPDATE academy_courses SET total_modules = 2, total_lessons = 3 WHERE id = 'platform-master';
UPDATE academy_courses SET total_modules = 2, total_lessons = 3 WHERE id = 'advanced-workflow';
UPDATE academy_courses SET total_modules = 1, total_lessons = 2 WHERE id = 'clm-consulting';
