const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Database setup
const dbPath = path.join(__dirname, 'data');
if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath);
}

function readData(filename) {
    try {
        const filePath = path.join(dbPath, `${filename}.json`);
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
        return [];
    } catch (error) {
        return [];
    }
}

function writeData(filename, data) {
    try {
        const filePath = path.join(dbPath, `${filename}.json`);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        return false;
    }
}

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Register user
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, userType, name, phone, university, degree } = req.body;
        
        const users = readData('users');
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = {
            id: Date.now(),
            email,
            password: hashedPassword,
            user_type: userType,
            name,
            phone,
            university,
            degree,
            created_at: new Date().toISOString()
        };
        
        users.push(user);
        writeData('users', users);
        res.json({ success: true, userId: user.id });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Login user
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, userType } = req.body;
        const users = readData('users');
        const user = users.find(u => u.email === email && u.user_type === userType);
        
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        res.json({ 
            success: true, 
            user: { id: user.id, email: user.email, name: user.name, userType: user.user_type } 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Post job
app.post('/api/jobs', async (req, res) => {
    try {
        const { companyId, title, jobType, location, salary, description, requirements } = req.body;
        const jobs = readData('jobs');
        const users = readData('users');
        const company = users.find(u => u.id === companyId);
        
        const job = {
            id: Date.now(),
            company_id: companyId,
            title,
            job_type: jobType,
            location,
            salary,
            description,
            requirements,
            company_name: company ? company.name : 'Unknown Company',
            posted_at: new Date().toISOString()
        };
        
        jobs.push(job);
        writeData('jobs', jobs);
        res.json({ success: true, job });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all jobs
app.get('/api/jobs', async (req, res) => {
    try {
        const jobs = readData('jobs');
        res.json(jobs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get company jobs
app.get('/api/jobs/company/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const jobs = readData('jobs');
        const companyJobs = jobs.filter(job => job.company_id == companyId);
        res.json(companyJobs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Apply for job
app.post('/api/applications', async (req, res) => {
    try {
        const { jobId, studentId } = req.body;
        const applications = readData('applications');
        
        const application = {
            id: Date.now(),
            job_id: jobId,
            student_id: studentId,
            status: 'Applied',
            applied_at: new Date().toISOString()
        };
        
        applications.push(application);
        writeData('applications', applications);
        res.json({ success: true, application });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get applications for company
app.get('/api/applications/company/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const applications = readData('applications');
        const jobs = readData('jobs');
        const users = readData('users');
        
        const companyJobs = jobs.filter(job => job.company_id == companyId);
        const jobIds = companyJobs.map(job => job.id);
        const companyApplications = applications.filter(app => jobIds.includes(app.job_id));
        
        const enrichedApplications = companyApplications.map(app => {
            const job = jobs.find(j => j.id === app.job_id);
            const student = users.find(u => u.id === app.student_id);
            
            return {
                ...app,
                job_title: job ? job.title : 'Unknown Job',
                student_name: student ? student.name : 'Unknown Student',
                student_email: student ? student.email : 'Unknown Email',
                student_phone: student ? student.phone : null,
                university: student ? student.university : null,
                degree: student ? student.degree : null
            };
        });
        
        res.json(enrichedApplications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update application status
app.put('/api/applications/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const applications = readData('applications');
        const appIndex = applications.findIndex(app => app.id == id);
        
        if (appIndex === -1) {
            return res.status(404).json({ error: 'Application not found' });
        }
        
        applications[appIndex].status = status;
        writeData('applications', applications);
        res.json({ success: true, application: applications[appIndex] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Job Portal Server running on port ${port}`);
    console.log('Visit: http://localhost:' + port);
});
