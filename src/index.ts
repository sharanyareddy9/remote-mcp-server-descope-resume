import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Hono } from "hono";
import { cors } from "hono/cors";

interface Env {
	DESCOPE_PROJECT_ID?: string;
	DESCOPE_MANAGEMENT_KEY?: string;
	SERVER_URL?: string;
}

// MCP Agent for Resume Server
export class ResumeMCP extends McpAgent<Env, null, {}> {
	server = new McpServer({
		name: "Resume Server",
		version: "1.0.0",
	});

	async init() {
		// Get complete resume data
		this.server.tool(
			"getResume",
			"Get complete resume data in JSON format",
			{},
			async () => {
				const resumeData = await this.getResumeData();
				return {
					content: [{
						type: "text",
						text: `Here's the complete resume data:\n\n${JSON.stringify(resumeData, null, 2)}`
					}],
				};
			}
		);

		// Get resume summary
		this.server.tool(
			"getResumeSummary", 
			"Get a formatted summary of the resume",
			{},
			async () => {
				const resumeData = await this.getResumeData();
				const summary = this.generateSummary(resumeData);
				return {
					content: [{
						type: "text",
						text: summary
					}],
				};
			}
		);

		// Search resume content
		this.server.tool(
			"searchResume",
			"Search through resume content by keyword",
			{
				query: z.string().describe("Search query to find in resume")
			},
			async ({ query }) => {
				const resumeData = await this.getResumeData();
				const results = this.searchResumeContent(resumeData, query);
				return {
					content: [{
						type: "text",
						text: results
					}],
				};
			}
		);

		// Test tool
		this.server.tool(
			"ping",
			"Test connectivity and server status",
			{},
			async () => ({
				content: [{
					type: "text",
					text: "🏓 Pong! Resume MCP server is working correctly."
				}],
			})
		);
	}

	private async getResumeData() {
		return {
			personalInfo: {
				name: "Your Name",
				email: "your.email@example.com", 
				phone: "+1 (555) 123-4567",
				location: "San Francisco, CA",
				linkedIn: "https://linkedin.com/in/yourprofile",
				github: "https://github.com/yourusername",
				website: "https://yourwebsite.com"
			},
			summary: "Experienced software engineer with expertise in full-stack development, cloud technologies, and scalable system design.",
			experience: [
				{
					company: "Tech Company Inc.",
					position: "Senior Software Engineer", 
					startDate: "2022-01",
					current: true,
					description: "Lead development of cloud-native applications and microservices architecture",
					achievements: [
						"Designed and implemented scalable APIs serving 1M+ requests/day",
						"Reduced deployment time by 80% through CI/CD automation",
						"Mentored 5 junior developers and led cross-functional teams"
					]
				}
			],
			education: [
				{
					institution: "Stanford University",
					degree: "Bachelor of Science",
					field: "Computer Science", 
					year: "2020",
					gpa: "3.8"
				}
			],
			skills: {
				technical: ["JavaScript", "TypeScript", "React", "Node.js", "Python", "AWS", "Docker", "Kubernetes"],
				languages: ["English (Native)", "Spanish (Conversational)"],
				certifications: ["AWS Certified Solutions Architect"]
			},
			projects: [
				{
					name: "Open Source Project",
					description: "A TypeScript library for building scalable web applications",
					technologies: ["TypeScript", "Node.js", "Jest"],
					url: "https://npm.js/package/your-project"
				}
			]
		};
	}

	private generateSummary(resumeData: any): string {
		const yearsOfExperience = resumeData.experience.length;
		const topSkills = resumeData.skills.technical.slice(0, 5).join(', ');
		const currentRole = resumeData.experience.find((exp: any) => exp.current);
		
		return `📋 Resume Summary:
		
👤 ${resumeData.personalInfo.name}
📧 ${resumeData.personalInfo.email}
📍 ${resumeData.personalInfo.location}

💼 Current Role: ${currentRole ? `${currentRole.position} at ${currentRole.company}` : 'Not specified'}
🎓 Education: ${resumeData.education[0]?.degree} in ${resumeData.education[0]?.field} from ${resumeData.education[0]?.institution}
⭐ Top Skills: ${topSkills}
🏆 Experience: ${yearsOfExperience} positions listed

📄 Summary: ${resumeData.summary}`;
	}

	private searchResumeContent(resumeData: any, query: string): string {
		const results: string[] = [];
		const searchTerm = query.toLowerCase();

		// Search in experience
		resumeData.experience.forEach((exp: any, index: number) => {
			if (exp.company.toLowerCase().includes(searchTerm) || 
				exp.position.toLowerCase().includes(searchTerm) || 
				exp.description.toLowerCase().includes(searchTerm)) {
				results.push(`🏢 Experience ${index + 1}: ${exp.position} at ${exp.company} - ${exp.description}`);
			}
			exp.achievements?.forEach((achievement: string) => {
				if (achievement.toLowerCase().includes(searchTerm)) {
					results.push(`🎯 Achievement: ${achievement}`);
				}
			});
		});

		// Search in skills
		resumeData.skills.technical.forEach((skill: string) => {
			if (skill.toLowerCase().includes(searchTerm)) {
				results.push(`🛠️ Technical Skill: ${skill}`);
			}
		});

		// Search in projects
		resumeData.projects?.forEach((project: any, index: number) => {
			if (project.name.toLowerCase().includes(searchTerm) || 
				project.description.toLowerCase().includes(searchTerm)) {
				results.push(`🚀 Project ${index + 1}: ${project.name} - ${project.description}`);
			}
		});

		if (results.length === 0) {
			return `No results found for "${query}" in the resume.`;
		}

		return `Found ${results.length} results for "${query}":\n\n${results.join('\n\n')}`;
	}
}

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use(cors({
	origin: "*",
	allowHeaders: ["Content-Type", "Authorization", "mcp-protocol-version"],
	maxAge: 86400,
}));

// Home page
app.get("/", (c) => {
	return c.html(`
		<html>
			<head>
				<title>Resume MCP Server</title>
				<style>
					body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
					.header { background: #f0f8ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
					.tools { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 15px; }
					.endpoint { background: #e8f5e8; padding: 10px; border-radius: 5px; font-family: monospace; }
				</style>
			</head>
			<body>
				<div class="header">
					<h1>🔗 Resume MCP Server</h1>
					<p>Model Context Protocol server for accessing resume data</p>
				</div>
				
				<div class="tools">
					<h2>📋 Available MCP Tools</h2>
					<ul>
						<li><strong>getResume</strong> - Get complete resume data in JSON format</li>
						<li><strong>getResumeSummary</strong> - Get a formatted summary of the resume</li>
						<li><strong>searchResume</strong> - Search through resume content by keyword</li>
						<li><strong>ping</strong> - Test connectivity and server status</li>
					</ul>
				</div>

				<div class="endpoint">
					<h3>🔌 MCP Connection Endpoint</h3>
					<code>${c.env.SERVER_URL || 'https://your-worker.workers.dev'}/sse</code>
				</div>

				<p><strong>Status:</strong> ✅ Server is running!</p>
			</body>
		</html>
	`);
});

// MCP endpoint (simplified for now - no authentication)
app.route("/sse", new Hono().mount("/", (req, env, ctx) => {
	return ResumeMCP.mount("/sse").fetch(req, env, ctx);
}));

export default app;
