/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     # ---------------------------------------------------------------------
 *     # Common
 *     # ---------------------------------------------------------------------
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: Erreur serveur
 *
 *     OkCountResponse:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *           example: true
 *         count:
 *           type: integer
 *           example: 4
 *
 *     # ---------------------------------------------------------------------
 *     # Categories
 *     # ---------------------------------------------------------------------
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: Santé
 *
 *     # ---------------------------------------------------------------------
 *     # Quotes
 *     # ---------------------------------------------------------------------
 *     QuoteTodayResponse:
 *       type: object
 *       properties:
 *         text:
 *           type: string
 *           example: "La discipline est le pont entre les objectifs et l’accomplissement."
 *         author:
 *           type: string
 *           nullable: true
 *           example: "Jim Rohn"
 *         language:
 *           type: string
 *           example: fr
 *
 *     # ---------------------------------------------------------------------
 *     # Auth
 *     # ---------------------------------------------------------------------
 *     AuthRegisterRequest:
 *       type: object
 *       required: [username, email, password]
 *       properties:
 *         username:
 *           type: string
 *           example: larbi
 *         email:
 *           type: string
 *           example: larbi@test.com
 *         password:
 *           type: string
 *           example: secret123
 *
 *     AuthRegisterResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Utilisateur créé avec succès
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               example: 1
 *             username:
 *               type: string
 *               example: larbi
 *             email:
 *               type: string
 *               example: larbi@test.com
 *
 *     AuthLoginRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           example: larbi@test.com
 *         password:
 *           type: string
 *           example: secret123
 *
 *     AuthLoginResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Connexion réussie
 *         token:
 *           type: string
 *           example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
 *
 *     # ---------------------------------------------------------------------
 *     # Users
 *     # ---------------------------------------------------------------------
 *     XpProgress:
 *       type: object
 *       description: Structure retournée par progressFromTotalXp()
 *       additionalProperties: true
 *
 *     UserProfileResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         email:
 *           type: string
 *           example: larbi@test.com
 *         username:
 *           type: string
 *           example: larbi
 *         xp:
 *           type: integer
 *           example: 420
 *         level:
 *           type: integer
 *           example: 7
 *         onboarding_done:
 *           type: boolean
 *           example: true
 *         xp_progress:
 *           $ref: '#/components/schemas/XpProgress'
 *         createdAt:
 *           type: string
 *           example: "2026-01-01T10:00:00.000Z"
 *         updatedAt:
 *           type: string
 *           example: "2026-01-10T12:00:00.000Z"
 *
 *     UserUpdateRequest:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           example: larbi@test.com
 *         username:
 *           type: string
 *           example: larbi_92
 *
 *     UserPriority:
 *       type: object
 *       properties:
 *         user_id:
 *           type: integer
 *           example: 1
 *         category_id:
 *           type: integer
 *           example: 2
 *         score:
 *           type: number
 *           example: 80
 *         Category:
 *           $ref: '#/components/schemas/Category'
 *
 *     UserPrioritiesOrderRequest:
 *       type: object
 *       required: [ordered_category_ids]
 *       properties:
 *         ordered_category_ids:
 *           type: array
 *           items:
 *             type: integer
 *           example: [2, 5, 1, 3]
 *
 *     # ---------------------------------------------------------------------
 *     # Onboarding
 *     # ---------------------------------------------------------------------
 *     OnboardingQuestion:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         code:
 *           type: string
 *           example: Q1
 *         question:
 *           type: string
 *           example: "Tu préfères progresser sur quel aspect en ce moment ?"
 *         sort_order:
 *           type: integer
 *           example: 1
 *
 *     OnboardingQuestionsResponse:
 *       type: object
 *       properties:
 *         language:
 *           type: string
 *           example: fr
 *         count:
 *           type: integer
 *           example: 12
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OnboardingQuestion'
 *
 *     OnboardingAnswerItem:
 *       type: object
 *       required: [question_id, value]
 *       properties:
 *         question_id:
 *           type: integer
 *           example: 1
 *         value:
 *           type: integer
 *           description: Valeur de 1 à 5
 *           example: 4
 *
 *     OnboardingAnswersRequest:
 *       type: object
 *       required: [answers]
 *       properties:
 *         user_id:
 *           type: integer
 *           nullable: true
 *           description: Utilisé si pas de middleware JWT
 *           example: 1
 *         language:
 *           type: string
 *           nullable: true
 *           example: fr
 *         answers:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OnboardingAnswerItem'
 *
 *     OnboardingPriorityResult:
 *       type: object
 *       properties:
 *         category_id:
 *           type: integer
 *           example: 2
 *         category_name:
 *           type: string
 *           example: Sport
 *         score:
 *           type: number
 *           example: 87.5
 *         rank:
 *           type: integer
 *           example: 1
 *
 *     OnboardingAnswersResponse:
 *       type: object
 *       properties:
 *         onboarding_done:
 *           type: boolean
 *           example: true
 *         user_id:
 *           type: integer
 *           example: 1
 *         priorities:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OnboardingPriorityResult'
 *
 *     # ---------------------------------------------------------------------
 *     # GoalTemplates
 *     # ---------------------------------------------------------------------
 *     GoalTemplateCategory:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: Santé
 *
 *     GoalTemplate:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 10
 *         title:
 *           type: string
 *           example: Boire 2L d'eau
 *         description:
 *           type: string
 *           nullable: true
 *           example: Hydratation quotidienne
 *         category_id:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         base_xp:
 *           type: integer
 *           example: 40
 *         frequency_type:
 *           type: string
 *           example: daily
 *         frequency_interval:
 *           type: integer
 *           example: 1
 *         week_start:
 *           type: integer
 *           example: 1
 *         max_per_period:
 *           type: integer
 *           example: 1
 *         enabled:
 *           type: boolean
 *           example: true
 *         owner_user_id:
 *           type: integer
 *           nullable: true
 *           example: 3
 *         visibility:
 *           type: string
 *           example: global
 *         Category:
 *           $ref: '#/components/schemas/GoalTemplateCategory'
 *
 *     GoalTemplateCreateRequest:
 *       type: object
 *       required: [title]
 *       properties:
 *         title:
 *           type: string
 *           example: Lire 20 pages
 *         description:
 *           type: string
 *           nullable: true
 *           example: Lecture quotidienne
 *         category_id:
 *           type: integer
 *           nullable: true
 *           example: 2
 *         base_xp:
 *           type: integer
 *           nullable: true
 *           example: 40
 *         frequency_type:
 *           type: string
 *           description: daily | weekly
 *           nullable: true
 *           example: daily
 *         frequency_interval:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         week_start:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         max_per_period:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         visibility:
 *           type: string
 *           description: global | private | unlisted
 *           nullable: true
 *           example: private
 *         enabled:
 *           type: boolean
 *           nullable: true
 *           example: true
 *
 *     GoalTemplateEnabledRequest:
 *       type: object
 *       required: [enabled]
 *       properties:
 *         enabled:
 *           type: boolean
 *           example: false
 *
 *     GoalTemplateEnabledResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 10
 *         enabled:
 *           type: boolean
 *           example: false
 *
 *     # ---------------------------------------------------------------------
 *     # UserGoals
 *     # ---------------------------------------------------------------------
 *     UserGoalItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 55
 *         user_id:
 *           type: integer
 *           example: 1
 *         status:
 *           type: string
 *           example: active
 *         template_id:
 *           type: integer
 *           example: 10
 *         title:
 *           type: string
 *           example: Boire 2L d'eau
 *         category_id:
 *           type: integer
 *           example: 1
 *         base_xp:
 *           type: integer
 *           example: 40
 *         frequency_type_override:
 *           type: string
 *           nullable: true
 *           example: daily
 *         frequency_interval_override:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         week_start_override:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         max_per_period_override:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         effective_frequency_type:
 *           type: string
 *           example: daily
 *         effective_frequency_interval:
 *           type: integer
 *           example: 1
 *         effective_week_start:
 *           type: integer
 *           example: 1
 *         effective_max_per_period:
 *           type: integer
 *           example: 1
 *         cadence:
 *           type: string
 *           example: daily
 *         last_completed_at:
 *           type: string
 *           nullable: true
 *           example: "2026-01-16T08:30:00.000Z"
 *         completions_in_period:
 *           type: integer
 *           example: 0
 *         can_complete:
 *           type: boolean
 *           example: true
 *         period_start:
 *           type: string
 *           example: "2026-01-16T00:00:00.000Z"
 *         period_end:
 *           type: string
 *           example: "2026-01-17T00:00:00.000Z"
 *
 *     UserGoalCreateRequest:
 *       type: object
 *       required: [template_id, cadence]
 *       properties:
 *         template_id:
 *           type: integer
 *           example: 10
 *         cadence:
 *           type: string
 *           description: daily | weekly
 *           example: daily
 *
 *     UserGoalCreateResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 55
 *         created:
 *           type: boolean
 *           example: true
 *         reactivated:
 *           type: boolean
 *           nullable: true
 *           example: false
 *         cadence:
 *           type: string
 *           example: daily
 *         message:
 *           type: string
 *           nullable: true
 *           example: Déjà présent et actif
 *
 *     UserGoalScheduleRequest:
 *       type: object
 *       required: [cadence]
 *       properties:
 *         cadence:
 *           type: string
 *           description: daily | weekly
 *           example: weekly
 *
 *     UserGoalScheduleResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 55
 *         updated:
 *           type: boolean
 *           example: true
 *         cadence:
 *           type: string
 *           example: weekly
 *         effective_frequency_type:
 *           type: string
 *           example: weekly
 *         period_start:
 *           type: string
 *           example: "2026-01-13T00:00:00.000Z"
 *         period_end:
 *           type: string
 *           example: "2026-01-20T00:00:00.000Z"
 *         completions_in_period:
 *           type: integer
 *           example: 0
 *         can_complete:
 *           type: boolean
 *           example: true
 *
 *     UserGoalCompleteResponse:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *           example: true
 *         awarded:
 *           type: integer
 *           example: 60
 *         newXp:
 *           type: integer
 *           example: 480
 *         newLevel:
 *           type: integer
 *           example: 8
 *         nextEligibleAt:
 *           type: string
 *           example: "2026-01-17T00:00:00.000Z"
 *         xp_progress:
 *           $ref: '#/components/schemas/XpProgress'
 *
 *     UserGoalArchiveResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 55
 *         status:
 *           type: string
 *           example: archived
 *
 *     UserGoalUnarchiveResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 55
 *         status:
 *           type: string
 *           example: active
 *         reactivated:
 *           type: boolean
 *           nullable: true
 *           example: true
 *         already_active:
 *           type: boolean
 *           nullable: true
 *           example: false
 *         cadence:
 *           type: string
 *           nullable: true
 *           example: daily
 *         period_start:
 *           type: string
 *           nullable: true
 *           example: "2026-01-16T00:00:00.000Z"
 *         period_end:
 *           type: string
 *           nullable: true
 *           example: "2026-01-17T00:00:00.000Z"
 *         completions_in_period:
 *           type: integer
 *           nullable: true
 *           example: 0
 *         can_complete:
 *           type: boolean
 *           nullable: true
 *           example: true
 *
 *     UserGoalDeleteResponse:
 *       type: object
 *       properties:
 *         deleted:
 *           type: boolean
 *           example: true
 */
