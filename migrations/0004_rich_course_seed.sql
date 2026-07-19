-- SpotCLM Academy - Rich Interactive Course Seed
-- 0004_rich_course_seed.sql

-- Insert the Masterclass Course
INSERT OR IGNORE INTO academy_courses (id, title, description, long_description, level, duration, price_usd, price_inr, category, platforms, status, created_at, updated_at) 
VALUES 
('clm-masterclass', 'The Ultimate CLM Masterclass', 'Experience a fully interactive journey into Contract Lifecycle Management with videos, interactive diagrams, and quizzes.', 'This course demonstrates the full power of SpotCLM Academy. You will experience rich markdown formatting, embedded diagrams, Did You Know callouts, and seamless video integration.', 'Intermediate', '2 Hours', 4900, 400000, 'Masterclass', '["All Platforms"]', 'published', datetime('now'), datetime('now'));

-- Insert Modules
INSERT OR IGNORE INTO academy_modules (id, course_id, title, description, sort_order) 
VALUES 
('mod-1', 'clm-masterclass', 'Introduction to CLM', 'The basics of contract lifecycle management.', 1),
('mod-2', 'clm-masterclass', 'Advanced Architectures', 'Building complex workflows and integrations.', 2);

-- Insert Lessons
INSERT OR IGNORE INTO academy_lessons (id, module_id, title, content_type, video_url, video_duration_minutes, content_body, sort_order) 
VALUES 
('les-1', 'mod-1', 'Welcome to the Masterclass', 'video', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 3, '<h3>Welcome!</h3><p>In this video, you will learn the absolute fundamentals. Watch closely and take notes.</p><p>did-you-know</p>', 1),
('les-2', 'mod-1', 'The Contract Lifecycle', 'text', NULL, NULL, '<h3>The 5 Stages of CLM</h3><p>Every contract goes through a standard lifecycle:</p><ul><li><b>Generation</b>: Drafting the initial contract.</li><li><b>Negotiation</b>: Redlining with the counterparty.</li><li><b>Approval</b>: Internal stakeholders review.</li><li><b>Execution</b>: Signatures are collected.</li><li><b>Management</b>: Obligations and renewals are tracked.</li></ul><p>Below is a diagram of the flow:</p><pre><code class="language-mermaid">graph LR\n  A[Generation] --> B[Negotiation]\n  B --> C[Approval]\n  C --> D[Execution]\n  D --> E[Management]</code></pre>', 2),
('les-3', 'mod-2', 'Integration Strategies', 'video', 'https://www.youtube.com/watch?v=jNQXAC9IVRw', 5, '<h3>Connecting the Enterprise</h3><p>Learn how to connect Salesforce, Workday, and your ERP to your CLM platform.</p><p>did-you-know</p>', 1),
('les-4', 'mod-2', 'Final Assessment', 'text', NULL, NULL, '<h3>Ready for the test?</h3><p>Click complete to finish the course journey and earn your certificate!</p>', 2);
